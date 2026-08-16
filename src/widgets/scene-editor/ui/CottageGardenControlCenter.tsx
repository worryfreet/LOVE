import {
  ChevronLeft,
  Flower2,
  Pause,
  Play,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  applyCottageGardenWeatherPreset,
  COTTAGE_GARDEN_SKY_ANIMATION,
  COTTAGE_GARDEN_TIME_ORDER,
  COTTAGE_GARDEN_TIME_PRESETS,
  COTTAGE_GARDEN_WEATHER_PRESETS,
  type CottageGardenFlowerTuning,
  type CottageGardenGrassLayerTuning,
  type CottageGardenTimeOfDay,
  type CottageGardenTuning,
  type CottageGardenWeatherPresetId,
} from "@/entities/scene";
import type { CottageGardenTuningSaveState } from "../model/useCottageGardenTuning";
import type { ScenePerformanceSnapshot } from "./SceneEditorCanvas";
import { GardenEditorPanel } from "./GardenEditorPanel";
import "../styles/cottage-garden-control-center.css";

type ControlTab = "quick" | "advanced" | "garden";
type WeatherPreset = Exclude<CottageGardenWeatherPresetId, "custom">;

const FLOWER_SPECIES = [
  { id: "wild-daisy", label: "野雏菊", shortLabel: "雏菊" },
  { id: "pink-cosmos", label: "粉波斯菊", shortLabel: "波斯菊" },
  { id: "blue-cornflower", label: "蓝矢车菊", shortLabel: "矢车菊" },
] as const;

const WEATHER_ORDER: readonly WeatherPreset[] = [
  "clear",
  "soft-clouds",
  "overcast",
  "mist",
];

const SAVE_STATE_LABELS: Record<CottageGardenTuningSaveState, string> = {
  default: "使用代码默认值",
  unsaved: "有未保存调整",
  saving: "正在写入项目 JSON",
  saved: "已写入项目 JSON",
  error: "保存失败：当前环境无法写入项目 JSON",
};

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("zh-CN");
}

function ControlSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="cottage-control-section"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <ChevronLeft size={14} aria-hidden="true" />
      </summary>
      <div className="cottage-control-section__body">{children}</div>
    </details>
  );
}

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cottage-range-control">
      <span>{label}</span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        aria-label={`${label}滑杆`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="cottage-range-control__value">
        <input
          type="number"
          min={minimum}
          max={maximum}
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

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (/^#[0-9a-f]{6}$/iu.test(draft)) {
      onChange(draft.toLowerCase());
      return;
    }
    setDraft(value);
  };

  return (
    <div className="cottage-color-control">
      <span>{label}</span>
      <span className="cottage-color-control__value">
        <input
          type="color"
          value={value}
          aria-label={`${label}拾色器`}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(event.target.value);
          }}
        />
        <input
          type="text"
          value={draft.toUpperCase()}
          aria-label={`${label}十六进制`}
          spellCheck={false}
          maxLength={7}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
        />
      </span>
    </div>
  );
}

function PerformanceStrip({
  performance,
}: {
  performance: ScenePerformanceSnapshot;
}) {
  return (
    <div className="cottage-performance-strip" aria-label="实时场景性能">
      <div>
        <span>FPS</span>
        <strong data-performance="fps">{Math.round(performance.fps)}</strong>
      </div>
      <div>
        <span>三角面</span>
        <strong data-performance="triangles">
          {formatCount(performance.triangles)}
        </strong>
      </div>
      <div>
        <span>DRAW</span>
        <strong data-performance="draw-calls">
          {performance.drawCalls}
        </strong>
      </div>
      <div>
        <span>帧耗时</span>
        <strong data-performance="frame-time">
          {performance.frameTimeMs.toFixed(1)}ms
        </strong>
      </div>
    </div>
  );
}

function FlowerQuickControls({
  flower,
  label,
  onChange,
}: {
  flower: CottageGardenFlowerTuning;
  label: string;
  onChange: (next: CottageGardenFlowerTuning) => void;
}) {
  return (
    <div className="cottage-flower-quick">
      <div className="cottage-flower-quick__heading">
        <span
          style={{ "--flower-color": flower.primaryColor } as CSSProperties}
        />
        <strong>{label}</strong>
        <ColorControl
          label={`${label}主色`}
          value={flower.primaryColor}
          onChange={(primaryColor) => onChange({ ...flower, primaryColor })}
        />
      </div>
      <RangeControl
        label="数量"
        value={flower.density}
        minimum={0}
        maximum={2}
        step={0.05}
        unit="×"
        onChange={(density) => onChange({ ...flower, density })}
      />
      <RangeControl
        label="最低"
        value={flower.heightMinMeters}
        minimum={0.05}
        maximum={0.65}
        step={0.005}
        unit="m"
        onChange={(heightMinMeters) =>
          onChange({ ...flower, heightMinMeters })
        }
      />
      <RangeControl
        label="最高"
        value={flower.heightMaxMeters}
        minimum={0.05}
        maximum={0.65}
        step={0.005}
        unit="m"
        onChange={(heightMaxMeters) =>
          onChange({ ...flower, heightMaxMeters })
        }
      />
    </div>
  );
}

function GrassLayerControls({
  layer,
  maximumHeight,
  onChange,
}: {
  layer: CottageGardenGrassLayerTuning;
  maximumHeight: number;
  onChange: (next: CottageGardenGrassLayerTuning) => void;
}) {
  return (
    <>
      <RangeControl
        label="数量密度"
        value={layer.density}
        minimum={0.08}
        maximum={1.5}
        step={0.02}
        unit="×"
        onChange={(density) => onChange({ ...layer, density })}
      />
      <RangeControl
        label="最低高度"
        value={layer.heightMinMeters}
        minimum={0.015}
        maximum={maximumHeight}
        step={0.001}
        unit="m"
        onChange={(heightMinMeters) => onChange({ ...layer, heightMinMeters })}
      />
      <RangeControl
        label="最高高度"
        value={layer.heightMaxMeters}
        minimum={0.015}
        maximum={maximumHeight}
        step={0.001}
        unit="m"
        onChange={(heightMaxMeters) => onChange({ ...layer, heightMaxMeters })}
      />
      <RangeControl
        label="草叶宽度"
        value={layer.widthMultiplier}
        minimum={0.45}
        maximum={1.8}
        step={0.01}
        unit="×"
        onChange={(widthMultiplier) => onChange({ ...layer, widthMultiplier })}
      />
    </>
  );
}

export interface CottageGardenControlCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tuning: CottageGardenTuning;
  onChange: (next: CottageGardenTuning) => void;
  onTimeTargetChange: (target: CottageGardenTimeOfDay) => void;
  onTransitionDurationChange: (seconds: number) => void;
  skyAnimationTimeSeconds: number;
  skyAnimationPlaying: boolean;
  onSkyAnimationPlay: () => void;
  onSkyAnimationPause: () => void;
  onSkyAnimationRestart: () => void;
  onSkyAnimationSeek: (seconds: number) => void;
  onReset: () => void;
  onSave: () => void;
  saveState: CottageGardenTuningSaveState;
  performance: ScenePerformanceSnapshot;
}

export function CottageGardenControlCenter({
  open,
  onOpenChange,
  tuning,
  onChange,
  onTimeTargetChange,
  onTransitionDurationChange,
  skyAnimationTimeSeconds,
  skyAnimationPlaying,
  onSkyAnimationPlay,
  onSkyAnimationPause,
  onSkyAnimationRestart,
  onSkyAnimationSeek,
  onReset,
  onSave,
  saveState,
  performance,
}: CottageGardenControlCenterProps) {
  const [tab, setTab] = useState<ControlTab>("quick");
  const setSection = <Key extends keyof CottageGardenTuning>(
    key: Key,
    value: CottageGardenTuning[Key],
  ) => onChange({ ...tuning, [key]: value });
  const setCustomWeather = <Key extends keyof CottageGardenTuning["weather"]>(
    key: Key,
    value: CottageGardenTuning["weather"][Key],
  ) =>
    setSection("weather", {
      ...tuning.weather,
      preset: "custom",
      [key]: value,
    });
  const chooseWeather = (preset: WeatherPreset) =>
    onChange(applyCottageGardenWeatherPreset(tuning, preset));
  const setFlower = (
    species: (typeof FLOWER_SPECIES)[number]["id"],
    flower: CottageGardenFlowerTuning,
  ) =>
    setSection("flowers", {
      ...tuning.flowers,
      [species]: flower,
    });

  if (!open) {
    return (
      <button
        className="cottage-control-launcher"
        type="button"
        aria-label="打开花海小院调试中心"
        onClick={() => onOpenChange(true)}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>视觉调试</span>
        <strong>{Math.round(performance.fps)} FPS</strong>
      </button>
    );
  }

  return (
    <aside className="cottage-control-center" aria-label="花海小院统一调试中心">
      <header className="cottage-control-center__header">
        <div>
          <small>GARDEN LAB / LIVE</small>
          <strong>视觉调试中心</strong>
        </div>
        <button
          type="button"
          aria-label="收起调试中心"
          onClick={() => onOpenChange(false)}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <PerformanceStrip performance={performance} />

      <div className="cottage-control-tabs" role="tablist" aria-label="配置层级">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "quick"}
          onClick={() => setTab("quick")}
        >
          <Sparkles size={14} aria-hidden="true" />
          快速配置
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "advanced"}
          onClick={() => setTab("advanced")}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          高级配置
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "garden"}
          onClick={() => setTab("garden")}
        >
          <Flower2 size={14} aria-hidden="true" />
          花园编辑
        </button>
      </div>

      <div className="cottage-control-center__scroll" data-tab={tab}>
        {tab === "quick" ? (
          <div className="cottage-control-panel" role="tabpanel">
            <ControlSection title="自然时刻" subtitle="始终按自然顺序向前过渡">
              <div className="cottage-preset-grid cottage-preset-grid--time">
                {COTTAGE_GARDEN_TIME_ORDER.map((time) => (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={tuning.time.target === time}
                    onClick={() => onTimeTargetChange(time)}
                  >
                    {COTTAGE_GARDEN_TIME_PRESETS[time].label}
                  </button>
                ))}
              </div>
              <RangeControl
                label="过渡时长"
                value={tuning.time.transitionDurationSeconds}
                minimum={2}
                maximum={30}
                step={1}
                unit="s"
                onChange={onTransitionDurationChange}
              />
            </ControlSection>

            <ControlSection
              title="告白天空动画"
              subtitle="10 秒流星与 I LOVE YOU! 星点组装"
            >
              <div className="cottage-sky-playback-actions">
                <button
                  type="button"
                  data-primary="true"
                  aria-label={skyAnimationPlaying ? "暂停告白天空动画" : "播放告白天空动画"}
                  onClick={
                    skyAnimationPlaying
                      ? onSkyAnimationPause
                      : onSkyAnimationPlay
                  }
                >
                  {skyAnimationPlaying ? (
                    <Pause size={14} aria-hidden="true" />
                  ) : (
                    <Play size={14} aria-hidden="true" />
                  )}
                  {skyAnimationPlaying ? "暂停" : "播放"}
                </button>
                <button
                  type="button"
                  aria-label="从头重播告白天空动画"
                  onClick={onSkyAnimationRestart}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  重播
                </button>
                <span aria-live="polite">
                  {skyAnimationTimeSeconds >=
                  COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds
                    ? "终幕保持"
                    : skyAnimationPlaying
                      ? "播放中"
                      : skyAnimationTimeSeconds > 0
                        ? "已暂停"
                        : "待播放"}
                </span>
              </div>
              <RangeControl
                label="动画进度"
                value={Number(skyAnimationTimeSeconds.toFixed(1))}
                minimum={0}
                maximum={COTTAGE_GARDEN_SKY_ANIMATION.durationSeconds}
                step={0.1}
                unit="s"
                onChange={onSkyAnimationSeek}
              />
              <p className="cottage-control-note">
                播放或定位会自动进入傍晚；终点保留星空告白，可随时重播。
              </p>
            </ControlSection>

            <ControlSection title="天气" subtitle="一键联动云、雾、太阳与风">
              <div className="cottage-preset-grid">
                {WEATHER_ORDER.map((weather) => (
                  <button
                    key={weather}
                    type="button"
                    aria-pressed={tuning.weather.preset === weather}
                    onClick={() => chooseWeather(weather)}
                  >
                    {COTTAGE_GARDEN_WEATHER_PRESETS[weather].label}
                  </button>
                ))}
              </div>
              {tuning.weather.preset === "custom" && (
                <p className="cottage-control-note">当前为自定义天气组合</p>
              )}
            </ControlSection>

            <ControlSection title="草地基调" subtitle="近景短草即时预览">
              <ColorControl
                label="绿地颜色"
                value={tuning.palette.groundColor}
                onChange={(groundColor) =>
                  setSection("palette", { ...tuning.palette, groundColor })
                }
              />
              <ColorControl
                label="草叶主色"
                value={tuning.palette.grassColor}
                onChange={(grassColor) =>
                  setSection("palette", { ...tuning.palette, grassColor })
                }
              />
              <ColorControl
                label="受光叶尖"
                value={tuning.palette.grassTipColor}
                onChange={(grassTipColor) =>
                  setSection("palette", { ...tuning.palette, grassTipColor })
                }
              />
              <ColorControl
                label="远景综合色"
                value={tuning.terrain.farMeadowTintColor}
                onChange={(farMeadowTintColor) =>
                  setSection("terrain", {
                    ...tuning.terrain,
                    farMeadowTintColor,
                  })
                }
              />
              <RangeControl
                label="远景染色强度"
                value={tuning.terrain.farMeadowTintStrength}
                minimum={0}
                maximum={1}
                step={0.02}
                onChange={(farMeadowTintStrength) =>
                  setSection("terrain", {
                    ...tuning.terrain,
                    farMeadowTintStrength,
                  })
                }
              />
              <GrassLayerControls
                layer={tuning.grass.near}
                maximumHeight={0.58}
                onChange={(near) =>
                  setSection("grass", { ...tuning.grass, near })
                }
              />
            </ControlSection>

            <ControlSection title="小屋与踏步石" subtitle="统一综合色，实时预览">
              <ColorControl
                label="小屋木色"
                value={tuning.structures.cottageWoodColor}
                onChange={(cottageWoodColor) =>
                  setSection("structures", {
                    ...tuning.structures,
                    cottageWoodColor,
                  })
                }
              />
              <ColorControl
                label="踏步石主色"
                value={tuning.structures.pathStoneColor}
                onChange={(pathStoneColor) =>
                  setSection("structures", {
                    ...tuning.structures,
                    pathStoneColor,
                  })
                }
              />
            </ControlSection>

            <ControlSection title="三种野花" subtitle="数量、高度与主色独立设置">
              {FLOWER_SPECIES.map((species) => (
                <FlowerQuickControls
                  key={species.id}
                  label={species.label}
                  flower={tuning.flowers[species.id]}
                  onChange={(flower) => setFlower(species.id, flower)}
                />
              ))}
            </ControlSection>

            <ControlSection title="日照与风" subtitle="影响整片花草的明暗与摆动">
              <ColorControl
                label="太阳色调"
                value={tuning.lighting.sunTint}
                onChange={(sunTint) =>
                  setSection("lighting", { ...tuning.lighting, sunTint })
                }
              />
              <RangeControl
                label="太阳亮度"
                value={tuning.lighting.sunIntensity}
                minimum={0}
                maximum={2.2}
                step={0.02}
                unit="×"
                onChange={(sunIntensity) =>
                  setSection("lighting", { ...tuning.lighting, sunIntensity })
                }
              />
              <RangeControl
                label="风吹力度"
                value={tuning.grass.windStrength}
                minimum={0}
                maximum={2.5}
                step={0.02}
                unit="×"
                onChange={(windStrength) =>
                  setSection("grass", { ...tuning.grass, windStrength })
                }
              />
            </ControlSection>
          </div>
        ) : tab === "advanced" ? (
          <div className="cottage-control-panel" role="tabpanel">
            <ControlSection title="性能详情" subtitle="每 0.5 秒采样，不干扰渲染">
              <div className="cottage-performance-details">
                <span>线段 <strong>{formatCount(performance.lines)}</strong></span>
                <span>点 <strong>{formatCount(performance.points)}</strong></span>
                <span>几何 <strong>{performance.geometries}</strong></span>
                <span>纹理 <strong>{performance.textures}</strong></span>
                <span>Shader <strong>{performance.shaderPrograms}</strong></span>
                <span>DPR <strong>{performance.pixelRatio.toFixed(2)}</strong></span>
              </div>
            </ControlSection>

            <ControlSection title="绿地与草叶颜色" subtitle="控制在三种主要绿色内">
              {(
                [
                  ["groundColor", "绿地底色"],
                  ["grassShadowColor", "草叶阴影"],
                  ["grassColor", "草叶主色"],
                  ["grassTipColor", "草叶高光"],
                ] as const
              ).map(([key, label]) => (
                <ColorControl
                  key={key}
                  label={label}
                  value={tuning.palette[key]}
                  onChange={(value) =>
                    setSection("palette", { ...tuning.palette, [key]: value })
                  }
                />
              ))}
            </ControlSection>

            <ControlSection title="小屋与踏步石" subtitle="暖木主色与浅色石板">
              <ColorControl
                label="小屋木色"
                value={tuning.structures.cottageWoodColor}
                onChange={(cottageWoodColor) =>
                  setSection("structures", {
                    ...tuning.structures,
                    cottageWoodColor,
                  })
                }
              />
              <RangeControl
                label="木板明暗变化"
                value={tuning.structures.cottageWoodVariation}
                minimum={0}
                maximum={0.06}
                step={0.002}
                onChange={(cottageWoodVariation) =>
                  setSection("structures", {
                    ...tuning.structures,
                    cottageWoodVariation,
                  })
                }
              />
              <ColorControl
                label="踏步石主色"
                value={tuning.structures.pathStoneColor}
                onChange={(pathStoneColor) =>
                  setSection("structures", {
                    ...tuning.structures,
                    pathStoneColor,
                  })
                }
              />
              <ColorControl
                label="踏步石暖色"
                value={tuning.structures.pathStoneWarmColor}
                onChange={(pathStoneWarmColor) =>
                  setSection("structures", {
                    ...tuning.structures,
                    pathStoneWarmColor,
                  })
                }
              />
              <RangeControl
                label="踏步石粗糙度"
                value={tuning.structures.pathStoneRoughness}
                minimum={0.7}
                maximum={1}
                step={0.01}
                onChange={(pathStoneRoughness) =>
                  setSection("structures", {
                    ...tuning.structures,
                    pathStoneRoughness,
                  })
                }
              />
            </ControlSection>

            <ControlSection title="地表材质与远景花毯">
              <RangeControl label="粗糙度" value={tuning.terrain.roughness} minimum={0.55} maximum={1} step={0.01} onChange={(roughness) => setSection("terrain", { ...tuning.terrain, roughness })} />
              <RangeControl label="地表起伏" value={tuning.terrain.bumpStrength} minimum={0} maximum={0.05} step={0.001} onChange={(bumpStrength) => setSection("terrain", { ...tuning.terrain, bumpStrength })} />
              <ColorControl label="远景综合色" value={tuning.terrain.farMeadowTintColor} onChange={(farMeadowTintColor) => setSection("terrain", { ...tuning.terrain, farMeadowTintColor })} />
              <RangeControl label="远景染色强度" value={tuning.terrain.farMeadowTintStrength} minimum={0} maximum={1} step={0.02} onChange={(farMeadowTintStrength) => setSection("terrain", { ...tuning.terrain, farMeadowTintStrength })} />
              <RangeControl label="远花强度" value={tuning.terrain.farFlowerStrength} minimum={0} maximum={1.6} step={0.02} unit="×" onChange={(farFlowerStrength) => setSection("terrain", { ...tuning.terrain, farFlowerStrength })} />
              <RangeControl label="远花密度" value={tuning.terrain.farFlowerDensity} minimum={0} maximum={1.6} step={0.02} unit="×" onChange={(farFlowerDensity) => setSection("terrain", { ...tuning.terrain, farFlowerDensity })} />
              <RangeControl label="远花尺度" value={tuning.terrain.farFlowerScale} minimum={0.55} maximum={1.8} step={0.02} unit="×" onChange={(farFlowerScale) => setSection("terrain", { ...tuning.terrain, farFlowerScale })} />
            </ControlSection>

            <ControlSection title="近景草" subtitle="相机周围高细节层">
              <GrassLayerControls layer={tuning.grass.near} maximumHeight={0.58} onChange={(near) => setSection("grass", { ...tuning.grass, near })} />
            </ControlSection>

            <ControlSection title="中景草" subtitle="填补近景与远景花毯之间的连续层">
              <GrassLayerControls layer={tuning.grass.middle} maximumHeight={0.36} onChange={(middle) => setSection("grass", { ...tuning.grass, middle })} />
            </ControlSection>

            <ControlSection title="风场">
              <RangeControl label="风吹力度" value={tuning.grass.windStrength} minimum={0} maximum={2.5} step={0.02} unit="×" onChange={(windStrength) => setSection("grass", { ...tuning.grass, windStrength })} />
              <RangeControl label="风速" value={tuning.grass.windSpeed} minimum={0.1} maximum={3} step={0.02} unit="×" onChange={(windSpeed) => setSection("grass", { ...tuning.grass, windSpeed })} />
              <RangeControl label="阵风" value={tuning.grass.gustStrength} minimum={0} maximum={2.5} step={0.02} unit="×" onChange={(gustStrength) => setSection("grass", { ...tuning.grass, gustStrength })} />
              <RangeControl label="风向" value={tuning.grass.windDirectionDegrees} minimum={0} maximum={360} step={1} unit="°" onChange={(windDirectionDegrees) => setSection("grass", { ...tuning.grass, windDirectionDegrees })} />
            </ControlSection>

            {FLOWER_SPECIES.map((species) => {
              const flower = tuning.flowers[species.id];
              return (
                <ControlSection key={species.id} title={species.label} subtitle="独立花型参数">
                  <RangeControl label="数量密度" value={flower.density} minimum={0} maximum={2} step={0.05} unit="×" onChange={(density) => setFlower(species.id, { ...flower, density })} />
                  <RangeControl label="最低高度" value={flower.heightMinMeters} minimum={0.05} maximum={0.65} step={0.005} unit="m" onChange={(heightMinMeters) => setFlower(species.id, { ...flower, heightMinMeters })} />
                  <RangeControl label="最高高度" value={flower.heightMaxMeters} minimum={0.05} maximum={0.65} step={0.005} unit="m" onChange={(heightMaxMeters) => setFlower(species.id, { ...flower, heightMaxMeters })} />
                  <RangeControl label="花型宽度" value={flower.widthMultiplier} minimum={0.5} maximum={1.8} step={0.02} unit="×" onChange={(widthMultiplier) => setFlower(species.id, { ...flower, widthMultiplier })} />
                  <ColorControl label="主色" value={flower.primaryColor} onChange={(primaryColor) => setFlower(species.id, { ...flower, primaryColor })} />
                  <ColorControl label="副色" value={flower.secondaryColor} onChange={(secondaryColor) => setFlower(species.id, { ...flower, secondaryColor })} />
                  <ColorControl label="点缀色" value={flower.accentColor} onChange={(accentColor) => setFlower(species.id, { ...flower, accentColor })} />
                </ControlSection>
              );
            })}

            <ControlSection title="太阳与整体光照">
              <ColorControl label="太阳色调" value={tuning.lighting.sunTint} onChange={(sunTint) => setSection("lighting", { ...tuning.lighting, sunTint })} />
              <RangeControl label="太阳亮度" value={tuning.lighting.sunIntensity} minimum={0} maximum={2.2} step={0.02} unit="×" onChange={(sunIntensity) => setSection("lighting", { ...tuning.lighting, sunIntensity })} />
              <RangeControl label="太阳视直径" value={tuning.lighting.sunSize} minimum={0.45} maximum={1.8} step={0.02} unit="×" onChange={(sunSize) => setSection("lighting", { ...tuning.lighting, sunSize })} />
              <RangeControl label="环境光" value={tuning.lighting.ambientIntensity} minimum={0} maximum={2} step={0.02} unit="×" onChange={(ambientIntensity) => setSection("lighting", { ...tuning.lighting, ambientIntensity })} />
              <RangeControl label="曝光" value={tuning.lighting.exposure} minimum={0.55} maximum={1.65} step={0.01} unit="×" onChange={(exposure) => setSection("lighting", { ...tuning.lighting, exposure })} />
            </ControlSection>

            <ControlSection title="天气细节" subtitle="手动调整后切换为自定义">
              <div className="cottage-preset-grid">
                {WEATHER_ORDER.map((weather) => (
                  <button key={weather} type="button" aria-pressed={tuning.weather.preset === weather} onClick={() => chooseWeather(weather)}>
                    {COTTAGE_GARDEN_WEATHER_PRESETS[weather].label}
                  </button>
                ))}
              </div>
              <RangeControl label="云量" value={tuning.weather.cloudCoverage} minimum={0} maximum={1} step={0.01} onChange={(value) => setCustomWeather("cloudCoverage", value)} />
              <RangeControl label="云层浓度" value={tuning.weather.cloudOpacity} minimum={0} maximum={1} step={0.01} onChange={(value) => setCustomWeather("cloudOpacity", value)} />
              <RangeControl label="天空饱和度" value={tuning.weather.skySaturation} minimum={0.35} maximum={1.5} step={0.01} unit="×" onChange={(value) => setCustomWeather("skySaturation", value)} />
              <RangeControl label="近雾距离" value={tuning.weather.fogNearScale} minimum={0.3} maximum={1.5} step={0.01} unit="×" onChange={(value) => setCustomWeather("fogNearScale", value)} />
              <RangeControl label="远雾距离" value={tuning.weather.fogFarScale} minimum={0.35} maximum={1.5} step={0.01} unit="×" onChange={(value) => setCustomWeather("fogFarScale", value)} />
              <ColorControl label="雾色" value={tuning.weather.fogTint} onChange={(value) => setCustomWeather("fogTint", value)} />
              <RangeControl label="雾色混合" value={tuning.weather.fogTintStrength} minimum={0} maximum={1} step={0.01} onChange={(value) => setCustomWeather("fogTintStrength", value)} />
            </ControlSection>

            <ControlSection title="远中近景拆分" subtitle="米制距离与 LOD 滞回">
              <RangeControl label="近草淡出起点" value={tuning.distance.nearGrassFadeStartMeters} minimum={0} maximum={28} step={0.5} unit="m" onChange={(nearGrassFadeStartMeters) => setSection("distance", { ...tuning.distance, nearGrassFadeStartMeters })} />
              <RangeControl label="近草淡出终点" value={tuning.distance.nearGrassFadeEndMeters} minimum={2} maximum={36} step={0.5} unit="m" onChange={(nearGrassFadeEndMeters) => setSection("distance", { ...tuning.distance, nearGrassFadeEndMeters })} />
              <RangeControl label="中草淡出起点" value={tuning.distance.middleGrassFadeStartMeters} minimum={12} maximum={100} step={1} unit="m" onChange={(middleGrassFadeStartMeters) => setSection("distance", { ...tuning.distance, middleGrassFadeStartMeters })} />
              <RangeControl label="中草淡出终点" value={tuning.distance.middleGrassFadeEndMeters} minimum={18} maximum={120} step={1} unit="m" onChange={(middleGrassFadeEndMeters) => setSection("distance", { ...tuning.distance, middleGrassFadeEndMeters })} />
              <RangeControl label="实体花活动半径" value={tuning.distance.flowerActiveRadiusMeters} minimum={14} maximum={32} step={1} unit="m" onChange={(flowerActiveRadiusMeters) => setSection("distance", { ...tuning.distance, flowerActiveRadiusMeters })} />
              <RangeControl label="远花混合起点" value={tuning.distance.farFlowerBlendStartMeters} minimum={4} maximum={60} step={1} unit="m" onChange={(farFlowerBlendStartMeters) => setSection("distance", { ...tuning.distance, farFlowerBlendStartMeters })} />
              <RangeControl label="远花混合终点" value={tuning.distance.farFlowerBlendEndMeters} minimum={8} maximum={90} step={1} unit="m" onChange={(farFlowerBlendEndMeters) => setSection("distance", { ...tuning.distance, farFlowerBlendEndMeters })} />
              <RangeControl label="聚合花起点" value={tuning.distance.aggregateFlowerStartMeters} minimum={6} maximum={90} step={1} unit="m" onChange={(aggregateFlowerStartMeters) => setSection("distance", { ...tuning.distance, aggregateFlowerStartMeters })} />
              <RangeControl label="聚合花终点" value={tuning.distance.aggregateFlowerEndMeters} minimum={10} maximum={130} step={1} unit="m" onChange={(aggregateFlowerEndMeters) => setSection("distance", { ...tuning.distance, aggregateFlowerEndMeters })} />
              <RangeControl label="近→中 LOD" value={tuning.distance.lodNearToMiddleMeters} minimum={12} maximum={90} step={1} unit="m" onChange={(lodNearToMiddleMeters) => setSection("distance", { ...tuning.distance, lodNearToMiddleMeters })} />
              <RangeControl label="中→远 LOD" value={tuning.distance.lodMiddleToFarMeters} minimum={28} maximum={180} step={1} unit="m" onChange={(lodMiddleToFarMeters) => setSection("distance", { ...tuning.distance, lodMiddleToFarMeters })} />
              <RangeControl label="LOD 滞回" value={tuning.distance.lodHysteresisMeters} minimum={1} maximum={10} step={0.5} unit="m" onChange={(lodHysteresisMeters) => setSection("distance", { ...tuning.distance, lodHysteresisMeters })} />
            </ControlSection>
          </div>
        ) : (
          <GardenEditorPanel
            garden={tuning.garden}
            onChange={(garden) => setSection("garden", garden)}
          />
        )}
      </div>

      <footer className="cottage-control-center__footer">
        <span data-save-state={saveState} aria-live="polite">
          {SAVE_STATE_LABELS[saveState]}
        </span>
        <button type="button" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" />
          恢复默认
        </button>
        <button
          type="button"
          data-primary="true"
          onClick={onSave}
          disabled={saveState === "saving"}
        >
          <Save size={14} aria-hidden="true" />
          {saveState === "saving"
            ? "正在写入"
            : saveState === "error"
              ? "重试保存"
              : "保存到 JSON"}
        </button>
      </footer>
    </aside>
  );
}
