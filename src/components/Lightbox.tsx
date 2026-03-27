import { useApp } from '../context/AppContext';

export default function Lightbox() {
  const { lightboxSrc, closeLightbox } = useApp();
  return (
    <div className={`lightbox${lightboxSrc ? ' open' : ''}`} onClick={closeLightbox}>
      {lightboxSrc && (
        <>
          <img src={lightboxSrc} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
        </>
      )}
    </div>
  );
}
