import React, { useState, useEffect, useRef } from 'react';

const ImageWithLoader = ({ src, alt, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-white rounded-xl overflow-hidden shrink-0 ${!isLoaded ? 'animate-pulse bg-gray-100' : ''}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <svg className="animate-spin h-6 w-6 text-[#059669]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      <img 
        src={src} 
        alt={alt}
        onClick={onClick}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-contain p-4 cursor-pointer hover:opacity-95 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default function ProductImages({ images, productName }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState('center');

  const scrollContainerRef = useRef(null);
  const isProgrammaticScroll = useRef(false);

  // Touch tracking for mobile swipe in modal
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 40;

  if (!images || images.length === 0) return null;

  // FIXED Point 3: Lock background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const navigateToImage = (index) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      setIsZoomed(false);
      setZoomOrigin('center');
      isProgrammaticScroll.current = true;
      setCurrentIndex(index);
      
      scrollContainerRef.current.scrollTo({
        left: index * width,
        behavior: isModalOpen ? 'auto' : 'smooth' 
      });
      
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, isModalOpen ? 50 : 300);
    }
  };

  const handleScroll = (e) => {
    if (isProgrammaticScroll.current) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    }
  };

  const handleMouseMove = (e) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
    if (isZoomed) {
      setIsZoomed(false);
      setZoomOrigin('center');
    } else {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomOrigin(`${x}% ${y}%`);
      setIsZoomed(true);
    }
  };

  // FIXED Point 2: Mobile Touch Handlers for the Modal
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd || isZoomed) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      navigateToImage((currentIndex + 1) % images.length);
    }
    if (isRightSwipe) {
      navigateToImage(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
    }
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault(); 
        navigateToImage((currentIndex + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToImage((currentIndex - 1 + images.length) % images.length);
      } else if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, currentIndex, images.length]);

  return (
    <div className="relative w-full h-48 md:h-52 group/gallery">
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none w-full h-full rounded-xl"
      >
        {images.map((img, index) => (
          <div key={index} className="snap-center shrink-0 w-full h-full">
            <ImageWithLoader 
              src={img} 
              alt={`${productName} view ${index + 1}`}
              onClick={() => { setIsModalOpen(true); setIsZoomed(false); }} 
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button 
            onClick={() => navigateToImage(currentIndex === 0 ? images.length - 1 : currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md text-gray-700 md:opacity-0 group-hover/gallery:opacity-100 transition-opacity cursor-pointer z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button 
            onClick={() => navigateToImage((currentIndex + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md text-gray-700 md:opacity-0 group-hover/gallery:opacity-100 transition-opacity cursor-pointer z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-xs z-10">
          {images.map((_, i) => (
            <div 
              key={i} 
              onClick={() => navigateToImage(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === currentIndex ? 'w-4 bg-orange-500' : 'w-1.5 bg-white/60'}`}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-hidden"
          onClick={() => { setIsModalOpen(false); setIsZoomed(false); }} 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <button 
            onClick={() => { setIsModalOpen(false); setIsZoomed(false); }}
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-white/10 p-2.5 rounded-full cursor-pointer transition-all z-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {images.length > 1 && !isZoomed && (
            <>
              {/* Arrow buttons are now hidden on smaller touch screens to encourage natural swiping, but visible on tablets/desktops */}
              <button 
                onClick={(e) => { e.stopPropagation(); navigateToImage(currentIndex === 0 ? images.length - 1 : currentIndex - 1); }}
                className="hidden md:block absolute left-4 text-white hover:bg-white/10 p-3 rounded-full cursor-pointer transition-all z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateToImage((currentIndex + 1) % images.length); }}
                className="hidden md:block absolute right-4 text-white hover:bg-white/10 p-3 rounded-full cursor-pointer transition-all z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </>
          )}

          <div className="max-w-full max-h-[85vh] overflow-hidden rounded-md flex items-center justify-center">
            <img 
              src={images[currentIndex]} 
              alt="Enlarged variant view" 
              onClick={handleImageClick}
              onMouseMove={handleMouseMove}
              style={{ transformOrigin: zoomOrigin }}
              className={`max-w-full max-h-[85vh] object-contain shadow-2xl transition-transform duration-200 select-none
                ${isZoomed ? 'scale-225 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}