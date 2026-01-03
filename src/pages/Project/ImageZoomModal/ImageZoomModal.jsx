// ImageZoomModal.jsx
import React, { useEffect, useMemo } from "react";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import styles from "./ImageZoomModal.module.scss";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const ImageZoomModal = ({
  open,
  images = [],
  index = 0,
  basePath = "",
  onClose,
  onChangeIndex,
}) => {
  const safeIndex = useMemo(() => {
    const max = Math.max(0, images.length - 1);
    return clamp(Number(index) || 0, 0, max);
  }, [index, images.length]);

  const filename = images[safeIndex] || "";
  const src = filename ? `${basePath}${filename}` : "";
  const alt = filename || "Cover image";

  const canNav = images.length > 1;

  const goPrev = () => {
    if (!canNav) return;
    const next = safeIndex === 0 ? images.length - 1 : safeIndex - 1;
    onChangeIndex?.(next);
  };

  const goNext = () => {
    if (!canNav) return;
    const next = safeIndex === images.length - 1 ? 0 : safeIndex + 1;
    onChangeIndex?.(next);
  };

  // Close on ESC + navigate on arrows
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, safeIndex, images.length, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose?.()}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.toolbar}>
          <div className={styles.title}>
            {alt}
            {images.length > 1 ? (
              <span className={styles.count}>
                {" "}
                • {safeIndex + 1}/{images.length}
              </span>
            ) : null}
          </div>

          <div className={styles.actions}>
            {canNav && (
              <>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={goPrev}
                  title="Previous (←)"
                  aria-label="Previous image"
                >
                  <FiChevronLeft />
                </button>

                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={goNext}
                  title="Next (→)"
                  aria-label="Next image"
                >
                  <FiChevronRight />
                </button>
              </>
            )}

            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => onClose?.()}
              title="Close"
              aria-label="Close zoom"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* ✅ Thumbnail strip */}
        {images.length > 1 && (
          <div className={styles.thumbStrip}>
            {images.map((img, i) => {
              const tSrc = `${basePath}${img}`;
              const active = i === safeIndex;

              return (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  className={`${styles.thumbBtn} ${
                    active ? styles.thumbBtnActive : ""
                  }`}
                  onClick={() => onChangeIndex?.(i)}
                  title={img}
                  aria-label={`Open image ${i + 1}`}
                >
                  <img
                    src={tSrc}
                    alt={img}
                    className={styles.thumbImg}
                    draggable={false}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.canvas}>
          <img
            src={src}
            alt={alt || "Zoomed cover"}
            className={styles.image}
            draggable={false}
          />
          <div className={styles.hint}>
            {images.length > 1 ? "←/→ to navigate • " : ""}
            Click outside or press ESC to close
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageZoomModal;
