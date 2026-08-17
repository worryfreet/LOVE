"use client";

import { ImagePlus, RotateCcw } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";

import type { LoveProjectConfig, ResolvedLovePhoto } from "@/domain/loveProjectConfig";
import { cottageDefaultMemoryPhotoUrl } from "@/entities/part";
import type { CottageInteriorPhotoSlotId } from "@/entities/scene";

interface PhotoWallSlot {
  id: CottageInteriorPhotoSlotId;
  label: string;
  shortLabel: string;
  left: number;
  width: number;
  aspectRatio: "3 / 2" | "2 / 3";
}

export const CREATOR_PHOTO_WALL_SLOTS: readonly PhotoWallSlot[] = [
  { id: "photo-02", label: "左侧横图", shortLabel: "左 1", left: 1, width: 11, aspectRatio: "3 / 2" },
  { id: "photo-03", label: "左侧竖图", shortLabel: "左 2", left: 14, width: 7, aspectRatio: "2 / 3" },
  { id: "photo-06", label: "主图左侧竖图", shortLabel: "左 3", left: 23, width: 7, aspectRatio: "2 / 3" },
  { id: "photo-01", label: "中央主照片", shortLabel: "主图", left: 32, width: 23, aspectRatio: "3 / 2" },
  { id: "photo-04", label: "主图右侧竖图", shortLabel: "右 1", left: 57, width: 7, aspectRatio: "2 / 3" },
  { id: "photo-07", label: "右侧横图", shortLabel: "右 2", left: 66, width: 11, aspectRatio: "3 / 2" },
  { id: "photo-08", label: "右侧竖图", shortLabel: "右 3", left: 79, width: 7, aspectRatio: "2 / 3" },
  { id: "photo-05", label: "最右横图", shortLabel: "右 4", left: 88, width: 11, aspectRatio: "3 / 2" },
] as const;

interface PhotoWallSlotEditorProps {
  gallery: LoveProjectConfig["gallery"];
  photos: ResolvedLovePhoto[];
  uploadingSlot: CottageInteriorPhotoSlotId | null;
  onUpload: (slotId: CottageInteriorPhotoSlotId, file: File) => Promise<void>;
  onRestoreDefault: (slotId: CottageInteriorPhotoSlotId) => Promise<void>;
}

const getSlotPhoto = (
  slotId: CottageInteriorPhotoSlotId,
  gallery: LoveProjectConfig["gallery"],
  photos: ResolvedLovePhoto[],
) => {
  const entry = gallery.find((item) => item.slotId === slotId);
  return {
    entry,
    photo: entry ? photos.find((item) => item.assetId === entry.assetId) : undefined,
  };
};

const SlotControl = ({
  slot,
  gallery,
  photos,
  uploadingSlot,
  onUpload,
  onRestoreDefault,
  className = "",
}: {
  slot: PhotoWallSlot;
  gallery: LoveProjectConfig["gallery"];
  photos: ResolvedLovePhoto[];
  uploadingSlot: CottageInteriorPhotoSlotId | null;
  onUpload: PhotoWallSlotEditorProps["onUpload"];
  onRestoreDefault: PhotoWallSlotEditorProps["onRestoreDefault"];
  className?: string;
}) => {
  const { entry, photo } = getSlotPhoto(slot.id, gallery, photos);
  const uploading = uploadingSlot === slot.id;
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void onUpload(slot.id, file);
  };

  const style = {
    "--photo-slot-left": `${slot.left}%`,
    "--photo-slot-width": `${slot.width}%`,
    "--photo-slot-ratio": slot.aspectRatio,
  } as CSSProperties;

  return (
    <div
      className={`photo-wall-slot ${className}`}
      data-filled={Boolean(photo)}
      data-uploading={uploading}
      style={style}
    >
      <label
        className="photo-wall-slot__frame"
        aria-label={`${slot.label}，${photo ? "已上传照片，点击替换" : "当前使用默认照片，点击上传"}`}
      >
        <img src={photo?.url ?? cottageDefaultMemoryPhotoUrl} alt="" aria-hidden />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={Boolean(uploadingSlot)} />
        <span>{uploading ? "上传中" : slot.shortLabel}</span>
        {!photo ? <ImagePlus size={15} aria-hidden /> : null}
      </label>
      {entry ? (
        <button
          type="button"
          className="photo-wall-slot__restore"
          aria-label={`${slot.label}恢复默认照片`}
          title="恢复默认照片"
          onClick={() => void onRestoreDefault(slot.id)}
          disabled={Boolean(uploadingSlot)}
        >
          <RotateCcw size={12} aria-hidden />
        </button>
      ) : null}
    </div>
  );
};

const TABLE_SLOT: PhotoWallSlot = {
  id: "photo-09",
  label: "桌面相框",
  shortLabel: "桌面",
  left: 0,
  width: 100,
  aspectRatio: "2 / 3",
};

export const PhotoWallSlotEditor = ({
  gallery,
  photos,
  uploadingSlot,
  onUpload,
  onRestoreDefault,
}: PhotoWallSlotEditorProps) => (
  <section className="photo-wall-editor" aria-labelledby="photo-wall-editor-title">
    <div className="photo-wall-editor__heading">
      <div>
        <h3 id="photo-wall-editor-title">按墙面位置上传</h3>
        <p>点击对应相框即可上传或替换；没有上传的位置会保留默认照片。</p>
      </div>
      <span>{gallery.length}/9 已定制</span>
    </div>

    <div className="photo-wall-editor__scroll" tabIndex={0} aria-label="照片墙布局，窄屏可左右滑动">
      <div className="photo-wall-editor__wall">
        <span className="photo-wall-editor__wall-label">小屋正面照片墙</span>
        {CREATOR_PHOTO_WALL_SLOTS.map((slot) => (
          <SlotControl
            key={slot.id}
            slot={slot}
            gallery={gallery}
            photos={photos}
            uploadingSlot={uploadingSlot}
            onUpload={onUpload}
            onRestoreDefault={onRestoreDefault}
          />
        ))}
      </div>
    </div>

    <div className="photo-wall-editor__table">
      <div>
        <strong>桌面相框</strong>
        <span>这是靠近信件的小竖相框</span>
      </div>
      <div className="photo-wall-editor__tabletop" aria-hidden />
      <SlotControl
        slot={TABLE_SLOT}
        gallery={gallery}
        photos={photos}
        uploadingSlot={uploadingSlot}
        onUpload={onUpload}
        onRestoreDefault={onRestoreDefault}
        className="photo-wall-slot--table"
      />
    </div>

    <div className="photo-wall-editor__legend">
      <span><i data-filled="false" /> 默认照片</span>
      <span><i data-filled="true" /> 已上传</span>
      <span>支持 JPG、PNG、WebP，单张不超过 10MB</span>
    </div>
  </section>
);
