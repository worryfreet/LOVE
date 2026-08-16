import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  addCottageGardenBedBlock,
  copyCottageGardenSide,
  COTTAGE_GARDEN_BED_SPECIES_IDS,
  COTTAGE_GARDEN_PLANT_SPECIES,
  COTTAGE_GARDEN_ROSE_COLOR_OPTIONS,
  COTTAGE_GARDEN_SIDE_BLOCK_LIMITS,
  createCottageGardenPlantSlot,
  moveCottageGardenBedBlock,
  normalizeCottageGardenPlanting,
  removeCottageGardenBedBlock,
  type CottageGardenBedBlock,
  type CottageGardenBedSpeciesId,
  type CottageGardenPlantRole,
  type CottageGardenPlantSlot,
  type CottageGardenPlantingTuning,
  type CottageGardenRoseColorSelectionId,
  type CottageGardenSideId,
} from "@/entities/scene";
import "../styles/garden-editor-panel.css";

const SIDE_LABELS: Record<CottageGardenSideId, string> = {
  left: "左侧",
  right: "右侧",
};

interface Selection {
  side: CottageGardenSideId;
  blockId: string;
}

function GardenRange({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="garden-editor-range">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label}滑杆`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="garden-editor-range__value">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label}数值`}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit && <small>{unit}</small>}
      </span>
    </label>
  );
}

function GardenColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="garden-editor-color">
      <span>{label}</span>
      <span>
        <input
          type="color"
          value={value}
          aria-label={`${label}拾色器`}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function roseColorOption(selectionId: CottageGardenRoseColorSelectionId) {
  return (
    COTTAGE_GARDEN_ROSE_COLOR_OPTIONS.find(
      (option) => option.id === selectionId,
    ) ?? COTTAGE_GARDEN_ROSE_COLOR_OPTIONS[0]
  );
}

function slotPlanColor(slot: CottageGardenPlantSlot) {
  return slot.speciesId !== "classic-rose" ||
    slot.roseColorSelectionId === "mixed"
    ? slot.primaryColor
    : roseColorOption(slot.roseColorSelectionId).palette[2];
}

function bedSpeciesOption(speciesId: CottageGardenBedSpeciesId) {
  return COTTAGE_GARDEN_PLANT_SPECIES.find(
    (species) => species.id === speciesId,
  );
}

function slotPlanLabel(slot: CottageGardenPlantSlot) {
  return slot.speciesId === "classic-rose"
    ? roseColorOption(slot.roseColorSelectionId).label
    : bedSpeciesOption(slot.speciesId)?.label ?? slot.speciesId;
}

function selectRoseColor(
  slot: CottageGardenPlantSlot,
  roseColorSelectionId: CottageGardenRoseColorSelectionId,
): CottageGardenPlantSlot {
  return {
    ...slot,
    roseColorSelectionId,
  };
}

function SlotEditor({
  role,
  slot,
  onChange,
  onRemove,
}: {
  role: CottageGardenPlantRole;
  slot: CottageGardenPlantSlot;
  onChange: (slot: CottageGardenPlantSlot) => void;
  onRemove?: () => void;
}) {
  return (
    <section className="garden-slot-editor">
      <header>
        <strong>{role === "primary" ? "主花" : "搭配花"}</strong>
        {onRemove && (
          <button type="button" onClick={onRemove}>
            移除搭配
          </button>
        )}
      </header>
      <label className="garden-editor-select">
        <span>花种</span>
        <select
          value={slot.speciesId}
          aria-label={`${role === "primary" ? "主花" : "搭配花"}花种`}
          onChange={(event) =>
            onChange(createCottageGardenPlantSlot(
              event.target.value as CottageGardenBedSpeciesId,
            ))
          }
        >
          {COTTAGE_GARDEN_BED_SPECIES_IDS.map((speciesId) => (
            <option key={speciesId} value={speciesId}>
              {bedSpeciesOption(speciesId)?.label ?? speciesId}
            </option>
          ))}
        </select>
      </label>
      {slot.speciesId === "classic-rose" ? (
        <label className="garden-editor-select">
          <span>玫瑰配色</span>
          <select
            value={slot.roseColorSelectionId}
            aria-label={`${role === "primary" ? "主花" : "搭配花"}玫瑰配色`}
            onChange={(event) =>
              onChange(
                selectRoseColor(
                  slot,
                  event.target.value as CottageGardenRoseColorSelectionId,
                ),
              )
            }
          >
            {COTTAGE_GARDEN_ROSE_COLOR_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="garden-editor-rose-preset">
          <span>模型库向日葵原型</span>
          <small>花盘、叶片与材质保持原型，只微调茎长</small>
        </div>
      )}
      <GardenRange
        label="数量"
        value={slot.count}
        min={0}
        max={200}
        step={1}
        unit="株"
        onChange={(count) => onChange({ ...slot, count })}
      />
      <GardenRange
        label="最低高度"
        value={slot.heightMinMeters}
        min={0.05}
        max={2.2}
        step={0.01}
        unit="m"
        onChange={(heightMinMeters) => onChange({ ...slot, heightMinMeters })}
      />
      <GardenRange
        label="最高高度"
        value={slot.heightMaxMeters}
        min={0.05}
        max={2.2}
        step={0.01}
        unit="m"
        onChange={(heightMaxMeters) => onChange({ ...slot, heightMaxMeters })}
      />
      <GardenRange
        label="整体尺度"
        value={slot.scale}
        min={0.25}
        max={1.8}
        step={0.01}
        unit="×"
        onChange={(scale) => onChange({ ...slot, scale })}
      />
      {slot.speciesId === "classic-rose" &&
      slot.roseColorSelectionId === "mixed" ? (
        <div className="garden-slot-editor__colors">
          <GardenColor
            label="主色"
            value={slot.primaryColor}
            onChange={(primaryColor) => onChange({ ...slot, primaryColor })}
          />
          <GardenColor
            label="辅色"
            value={slot.secondaryColor}
            onChange={(secondaryColor) => onChange({ ...slot, secondaryColor })}
          />
          <GardenColor
            label="点缀"
            value={slot.accentColor}
            onChange={(accentColor) => onChange({ ...slot, accentColor })}
          />
        </div>
      ) : slot.speciesId === "classic-rose" ? (
        <div className="garden-editor-rose-preset">
          <span>模型库五段色阶</span>
          <div aria-hidden="true">
            {roseColorOption(slot.roseColorSelectionId).palette.map(
              (color) => (
                <i key={color} style={{ backgroundColor: color }} />
              ),
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export interface GardenEditorPanelProps {
  garden: CottageGardenPlantingTuning;
  onChange: (garden: CottageGardenPlantingTuning) => void;
}

export function GardenEditorPanel({
  garden,
  onChange,
}: GardenEditorPanelProps) {
  const [selection, setSelection] = useState<Selection>(() => ({
    side: "left",
    blockId: garden.left.blocks[0]?.id ?? "left-01",
  }));
  const [history, setHistory] = useState(() => [garden]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentHistory = history[historyIndex];

  useEffect(() => {
    if (JSON.stringify(currentHistory) === JSON.stringify(garden)) return;
    setHistory([garden]);
    setHistoryIndex(0);
  }, [currentHistory, garden]);

  useEffect(() => {
    const blocks = garden[selection.side].blocks;
    if (blocks.some((block) => block.id === selection.blockId)) return;
    setSelection({
      side: selection.side,
      blockId: blocks[0]?.id ?? `${selection.side}-01`,
    });
  }, [garden, selection]);

  const selectedBlock = useMemo(
    () =>
      garden[selection.side].blocks.find(
        (block) => block.id === selection.blockId,
      ) ?? garden[selection.side].blocks[0],
    [garden, selection],
  );
  const selectedIndex = garden[selection.side].blocks.findIndex(
    (block) => block.id === selectedBlock?.id,
  );

  const commit = (nextGarden: CottageGardenPlantingTuning) => {
    const normalized = normalizeCottageGardenPlanting(nextGarden);
    if (JSON.stringify(normalized) === JSON.stringify(garden)) return;
    const nextHistory = [...history.slice(0, historyIndex + 1), normalized].slice(
      -40,
    );
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    onChange(normalized);
  };

  const travelHistory = (direction: -1 | 1) => {
    const nextIndex = historyIndex + direction;
    const snapshot = history[nextIndex];
    if (!snapshot) return;
    setHistoryIndex(nextIndex);
    onChange(snapshot);
  };

  const updateBlock = (updater: (block: CottageGardenBedBlock) => CottageGardenBedBlock) => {
    if (!selectedBlock) return;
    commit({
      ...garden,
      [selection.side]: {
        blocks: garden[selection.side].blocks.map((block) =>
          block.id === selectedBlock.id ? updater(block) : block,
        ),
      },
    });
  };

  const updateSlot = (
    role: CottageGardenPlantRole,
    slot: CottageGardenPlantSlot | null,
  ) =>
    updateBlock((block) => ({
      ...block,
      [role]: slot,
    }));

  const addBlock = (side: CottageGardenSideId) => {
    const beforeIds = new Set(garden[side].blocks.map((block) => block.id));
    const next = addCottageGardenBedBlock(
      garden,
      side,
      selection.side === side ? selection.blockId : undefined,
    );
    const added = next[side].blocks.find((block) => !beforeIds.has(block.id));
    if (added) setSelection({ side, blockId: added.id });
    commit(next);
  };

  const removeBlock = () => {
    if (!selectedBlock) return;
    const next = removeCottageGardenBedBlock(
      garden,
      selection.side,
      selectedBlock.id,
    );
    const nextSelection =
      next[selection.side].blocks[Math.max(0, selectedIndex - 1)] ??
      next[selection.side].blocks[0];
    if (nextSelection) {
      setSelection({ side: selection.side, blockId: nextSelection.id });
    }
    commit(next);
  };

  const moveBlock = (direction: -1 | 1) => {
    if (!selectedBlock) return;
    commit(
      moveCottageGardenBedBlock(
        garden,
        selection.side,
        selectedBlock.id,
        direction,
      ),
    );
  };

  const totalPlants = (side: CottageGardenSideId) =>
    garden[side].blocks.reduce(
      (sum, block) =>
        sum + block.primary.count + (block.companion?.count ?? 0),
      0,
    );

  return (
    <div className="garden-editor-panel" role="tabpanel">
      <header className="garden-editor-panel__intro">
        <div>
          <small>GARDEN PLAN / EDITABLE</small>
          <strong>花径分区</strong>
        </div>
        <span>沿小路从门口 → 小屋</span>
      </header>

      <div className="garden-editor-history" aria-label="花园编辑历史">
        <button
          type="button"
          disabled={historyIndex === 0}
          onClick={() => travelHistory(-1)}
        >
          <Undo2 size={13} aria-hidden="true" /> 撤销
        </button>
        <button
          type="button"
          disabled={historyIndex >= history.length - 1}
          onClick={() => travelHistory(1)}
        >
          <Redo2 size={13} aria-hidden="true" /> 重做
        </button>
        <span>最多保留 40 步</span>
      </div>

      <section className="garden-plan" aria-label="左右花圃分区平面图">
        {(["left", "right"] as const).map((side) => (
          <div className="garden-plan__side" key={side}>
            <header>
              <strong>{SIDE_LABELS[side]}</strong>
              <span>
                {garden[side].blocks.length} 块 · {totalPlants(side)} 株
              </span>
              <button
                type="button"
                aria-label={`${SIDE_LABELS[side]}增加分区`}
                disabled={
                  garden[side].blocks.length >=
                  COTTAGE_GARDEN_SIDE_BLOCK_LIMITS[1]
                }
                onClick={() => addBlock(side)}
              >
                <Plus size={12} aria-hidden="true" />
              </button>
            </header>
            <div className="garden-plan__blocks">
              {garden[side].blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  aria-pressed={
                    selection.side === side && selection.blockId === block.id
                  }
                  style={
                    {
                      "--block-color": slotPlanColor(block.primary),
                      "--block-weight": block.lengthWeight,
                    } as CSSProperties
                  }
                  onClick={() => setSelection({ side, blockId: block.id })}
                >
                  <span>{index + 1}</span>
                  <strong>
                    {slotPlanLabel(block.primary)}
                  </strong>
                  <small>
                    {block.primary.count + (block.companion?.count ?? 0)} 株
                  </small>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="garden-plan__path" aria-hidden="true">
          无草小路
        </div>
      </section>

      <div className="garden-editor-copy-row">
        <button
          type="button"
          onClick={() => commit(copyCottageGardenSide(garden, "left", "right"))}
        >
          <Copy size={12} aria-hidden="true" /> 左侧复制到右侧
        </button>
        <button
          type="button"
          onClick={() => commit(copyCottageGardenSide(garden, "right", "left"))}
        >
          <Copy size={12} aria-hidden="true" /> 右侧复制到左侧
        </button>
      </div>

      {selectedBlock && (
        <section className="garden-block-editor">
          <header>
            <div>
              <small>{SIDE_LABELS[selection.side]} / BLOCK {selectedIndex + 1}</small>
              <strong>分区设置</strong>
            </div>
            <div>
              <button
                type="button"
                aria-label="分区前移"
                disabled={selectedIndex <= 0}
                onClick={() => moveBlock(-1)}
              >
                <ArrowUp size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="分区后移"
                disabled={selectedIndex >= garden[selection.side].blocks.length - 1}
                onClick={() => moveBlock(1)}
              >
                <ArrowDown size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="删除分区"
                disabled={
                  garden[selection.side].blocks.length <=
                  COTTAGE_GARDEN_SIDE_BLOCK_LIMITS[0]
                }
                onClick={removeBlock}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          </header>
          <GardenRange
            label="分区长度权重"
            value={selectedBlock.lengthWeight}
            min={0.25}
            max={4}
            step={0.05}
            unit="×"
            onChange={(lengthWeight) =>
              updateBlock((block) => ({ ...block, lengthWeight }))
            }
          />
          <GardenRange
            label="成簇程度"
            value={selectedBlock.clusterStrength}
            min={0}
            max={1}
            step={0.02}
            onChange={(clusterStrength) =>
              updateBlock((block) => ({ ...block, clusterStrength }))
            }
          />
          <label className="garden-editor-seed">
            <span>随机种子</span>
            <input
              type="number"
              min={1}
              max={2_147_483_647}
              step={1}
              value={selectedBlock.seed}
              onChange={(event) =>
                updateBlock((block) => ({
                  ...block,
                  seed: Number(event.target.value),
                }))
              }
            />
          </label>

          <SlotEditor
            role="primary"
            slot={selectedBlock.primary}
            onChange={(slot) => updateSlot("primary", slot)}
          />
          {selectedBlock.companion ? (
            <SlotEditor
              role="companion"
              slot={selectedBlock.companion}
              onChange={(slot) => updateSlot("companion", slot)}
              onRemove={() => updateSlot("companion", null)}
            />
          ) : (
            <button
              className="garden-editor-add-companion"
              type="button"
              onClick={() =>
                updateSlot("companion", {
                  ...selectedBlock.primary,
                  count: Math.max(8, Math.round(selectedBlock.primary.count / 2)),
                  speciesId: "classic-rose",
                  roseColorSelectionId: "mixed",
                  primaryColor: selectedBlock.primary.secondaryColor,
                  secondaryColor: selectedBlock.primary.accentColor,
                  accentColor: selectedBlock.primary.primaryColor,
                })
              }
            >
              <Plus size={13} aria-hidden="true" /> 添加搭配花
            </button>
          )}
        </section>
      )}

      <section className="garden-global-editor">
        <header>
          <small>GLOBAL</small>
          <strong>小路与花圃</strong>
        </header>
        <GardenRange
          label="小路无草边距"
          value={garden.pathClearanceMeters}
          min={0.05}
          max={0.4}
          step={0.01}
          unit="m"
          onChange={(pathClearanceMeters) =>
            commit({ ...garden, pathClearanceMeters })
          }
        />
        <GardenRange
          label="路缘颜色柔化"
          value={garden.pathSurfaceBlendFeatherMeters}
          min={0.18}
          max={0.7}
          step={0.01}
          unit="m"
          onChange={(pathSurfaceBlendFeatherMeters) =>
            commit({ ...garden, pathSurfaceBlendFeatherMeters })
          }
        />
        <GardenRange
          label="路缘交叉起伏"
          value={garden.pathSurfaceEdgeWarpMeters}
          min={0.04}
          max={0.24}
          step={0.01}
          unit="m"
          onChange={(pathSurfaceEdgeWarpMeters) =>
            commit({ ...garden, pathSurfaceEdgeWarpMeters })
          }
        />
        <GardenRange
          label="花圃边缘柔化"
          value={garden.bedEdgeFeatherMeters}
          min={0.08}
          max={0.8}
          step={0.01}
          unit="m"
          onChange={(bedEdgeFeatherMeters) =>
            commit({ ...garden, bedEdgeFeatherMeters })
          }
        />
        <GardenRange
          label="花圃留草密度"
          value={garden.bedGrassDensity}
          min={0}
          max={0.5}
          step={0.01}
          unit="×"
          onChange={(bedGrassDensity) => commit({ ...garden, bedGrassDensity })}
        />
      </section>

      <section className="garden-global-editor">
        <header>
          <small>COTTAGE TRELLIS</small>
          <strong>小屋牵牛花</strong>
          <label className="garden-editor-switch">
            <input
              type="checkbox"
              checked={garden.trellis.enabled}
              onChange={(event) =>
                commit({
                  ...garden,
                  trellis: { ...garden.trellis, enabled: event.target.checked },
                })
              }
            />
            启用
          </label>
        </header>
        <GardenRange
          label="宿主路线"
          value={garden.trellis.count}
          min={0}
          max={10}
          step={1}
          unit="条"
          onChange={(count) =>
            commit({ ...garden, trellis: { ...garden.trellis, count } })
          }
        />
        <GardenRange
          label="最低高度"
          value={garden.trellis.heightMinMeters}
          min={0.4}
          max={2.4}
          step={0.02}
          unit="m"
          onChange={(heightMinMeters) =>
            commit({
              ...garden,
              trellis: { ...garden.trellis, heightMinMeters },
            })
          }
        />
        <GardenRange
          label="最高高度"
          value={garden.trellis.heightMaxMeters}
          min={0.4}
          max={2.4}
          step={0.02}
          unit="m"
          onChange={(heightMaxMeters) =>
            commit({
              ...garden,
              trellis: { ...garden.trellis, heightMaxMeters },
            })
          }
        />
        <div className="garden-slot-editor__colors">
          <GardenColor
            label="主色"
            value={garden.trellis.primaryColor}
            onChange={(primaryColor) =>
              commit({
                ...garden,
                trellis: { ...garden.trellis, primaryColor },
              })
            }
          />
          <GardenColor
            label="辅色"
            value={garden.trellis.secondaryColor}
            onChange={(secondaryColor) =>
              commit({
                ...garden,
                trellis: { ...garden.trellis, secondaryColor },
              })
            }
          />
          <GardenColor
            label="点缀"
            value={garden.trellis.accentColor}
            onChange={(accentColor) =>
              commit({
                ...garden,
                trellis: { ...garden.trellis, accentColor },
              })
            }
          />
        </div>
      </section>

      <footer className="garden-editor-panel__legend">
        <span>共 {COTTAGE_GARDEN_PLANT_SPECIES.length} 种花</span>
        <span>{COTTAGE_GARDEN_BED_SPECIES_IDS.length} 种花圃花 + 1 种花藤</span>
      </footer>
    </div>
  );
}
