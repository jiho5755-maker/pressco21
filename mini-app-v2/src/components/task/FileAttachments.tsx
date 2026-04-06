import { useState, useRef, useCallback } from "react";
import { uploadFile, updateTask } from "@/lib/api";
import type { FileAttachment } from "@/lib/api";
import type { Task } from "@/lib/types";
import { Paperclip, Plus, X, Image, Film, FileText, Loader2, Upload, Archive } from "lucide-react";

interface FileAttachmentsProps {
  task: Task;
  onTaskUpdate: (task: Task) => void;
}

const ACCEPT = "image/*,video/*,application/pdf";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (type.startsWith("video/")) return <Film className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

function isVideoType(type: string): boolean {
  return type.startsWith("video/");
}

export function FileAttachments({ task, onTaskUpdate }: FileAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const details = task.detailsJson as Record<string, unknown>;
  const attachments = (details?.attachments ?? []) as FileAttachment[];

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploading(true);
      const newAttachments = [...attachments];

      for (const file of fileArray) {
        try {
          const result = await uploadFile(file, task.id);
          newAttachments.push(result);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      try {
        await updateTask(task.id, {
          description: (details?.description as string) ?? undefined,
          startAt: (details?.startAt as string) ?? undefined,
          links: (details?.links as string[]) ?? undefined,
        });

        // detailsJson에 attachments 저장 (links 배열과 별도)
        // PATCH API가 detailsMerge를 지원하므로 직접 호출
        const resp = await fetch("/api/admin/tasks/" + encodeURIComponent(task.id), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-flora-automation-key": "pressco21-admin-2026",
          },
          body: JSON.stringify({ attachments: newAttachments }),
        });
        const data = await resp.json();

        if (data.ok) {
          onTaskUpdate({
            ...task,
            detailsJson: { ...task.detailsJson, attachments: newAttachments },
          });
        }
      } catch (err) {
        console.error("Save attachments failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [task, attachments, details, onTaskUpdate],
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const updated = attachments.filter((_, i) => i !== index);
      try {
        await fetch("/api/admin/tasks/" + encodeURIComponent(task.id), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-flora-automation-key": "pressco21-admin-2026",
          },
          body: JSON.stringify({ attachments: updated }),
        });
        onTaskUpdate({
          ...task,
          detailsJson: { ...task.detailsJson, attachments: updated },
        });
      } catch (err) {
        console.error("Remove attachment failed:", err);
      }
    },
    [task, attachments, onTaskUpdate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">
            첨부파일 {attachments.length > 0 && `(${attachments.length})`}
          </span>
        </div>
        <button
          type="button"
          className="text-[11px] text-primary font-medium flex items-center gap-0.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          추가
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 드래그앤드롭 영역 */}
      {attachments.length === 0 && !uploading && (
        <div
          className={`flex flex-col items-center justify-center py-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/40 hover:border-primary/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-5 w-5 text-muted-foreground/40 mb-1.5" />
          <p className="text-[11px] text-muted-foreground/60">
            사진/영상/PDF를 여기에 놓거나 탭하세요
          </p>
          <p className="text-[9px] text-muted-foreground/40 mt-0.5">최대 50MB</p>
        </div>
      )}

      {/* 업로드 중 */}
      {uploading && (
        <div className="flex items-center gap-2 py-3 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[12px] text-muted-foreground">업로드 중...</span>
        </div>
      )}

      {/* 첨부 파일 목록 */}
      {attachments.length > 0 && (
        <div
          className={`space-y-1.5 ${dragOver ? "ring-2 ring-primary/30 rounded-lg p-1" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {/* 보관된 파일 */}
              {att.archived ? (
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-dashed border-amber-300/60 bg-amber-50/30 cursor-pointer"
                  onClick={() => {
                    const path = att.archivedFile ?? att.name;
                    navigator.clipboard.writeText(path).catch(() => {});
                  }}
                >
                  <Archive className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-amber-700 truncate">{att.name}</p>
                    <p className="text-[9px] text-amber-500">
                      보관됨 {att.archivedAt ?? ""} &middot; {formatFileSize(att.size)}
                    </p>
                    {att.archivedFile && (
                      <p className="text-[9px] text-amber-400 truncate mt-0.5">
                        금고: {att.archivedFile} (탭하여 복사)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* 이미지 프리뷰 */}
                  {isImageType(att.type) && (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full max-h-48 object-cover rounded-lg border border-border/40"
                        loading="lazy"
                      />
                    </a>
                  )}

                  {/* 비디오 프리뷰 */}
                  {isVideoType(att.type) && (
                    <video
                      src={att.url}
                      controls
                      preload="metadata"
                      className="w-full max-h-48 rounded-lg border border-border/40"
                    />
                  )}

                  {/* 일반 파일 */}
                  {!isImageType(att.type) && !isVideoType(att.type) && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      {getFileIcon(att.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                      </div>
                    </a>
                  )}

                  {/* 파일 정보 (이미지/비디오) */}
                  {(isImageType(att.type) || isVideoType(att.type)) && (
                    <div className="flex items-center justify-between mt-0.5 px-0.5">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[70%]">
                        {att.name} ({formatFileSize(att.size)})
                      </span>
                    </div>
                  )}

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 text-muted-foreground/60 hover:text-destructive transition-colors shadow-sm"
                    onClick={() => handleRemove(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 추가 업로드 버튼 */}
          {!uploading && (
            <button
              type="button"
              className="w-full py-2 rounded-lg border border-dashed border-border/40 text-[11px] text-muted-foreground/60 hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-1"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Plus className="h-3 w-3" />
              파일 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
