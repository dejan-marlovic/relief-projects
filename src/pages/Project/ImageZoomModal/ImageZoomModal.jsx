import React, { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import styles from "./ImageZoomModal.module.scss";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const ImageZoomModal = ({
  open,
  images = [],
  captions = [],
  index = 0,
  basePath = "",
  onClose,
  onChangeIndex,
}) => {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const captionId = useId();
  const safeIndex = useMemo(() => {
    const max = Math.max(0, images.length - 1);
    return clamp(Math.trunc(Number(index)) || 0, 0, max);
  }, [index, images.length]);

  const filename = images[safeIndex] || "";
  const src = filename ? `${basePath}${filename}` : "";
  const alt = filename || "Cover image";

  const caption = captions?.[safeIndex] || "";

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

  // Native modality keeps keyboard focus and interaction inside the viewer.
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    element.showModal();
    closeButton.current.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <dialog
      ref={dialog}
      className={styles.backdrop}
      aria-label="Project image viewer"
      aria-modal="true"
      aria-describedby={caption.trim() ? captionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose?.(); }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (canNav && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          if (event.key === "ArrowLeft") goPrev();
          else goNext();
        }
      }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div className={styles.modal}>
        <div className={styles.toolbar}>
          <div className={styles.title} aria-live="polite" aria-atomic="true">
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
              ref={closeButton}
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

        {/* Thumbnail strip */}
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
                  aria-current={active ? "true" : undefined}
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
          <div className={styles.imageWrapper}>
            {src ? <img
              src={src}
              alt={alt || "Zoomed cover"}
              className={styles.image}
              draggable={false}
            /> : <p>No image available.</p>}
          </div>

          {caption && caption.trim() ? (
            <div id={captionId} className={styles.caption}>{caption}</div>
          ) : null}

          <div className={styles.hint}>
            {images.length > 1 ? "←/→ to navigate • " : ""}
            Click outside or press ESC to close
          </div>
        </div>
      </div>
    </dialog>, document.body
  );
};

export default ImageZoomModal;
