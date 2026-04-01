// src/components/HomeSections.jsx
import PopularCategories from "./CategoriesSection.jsx";
import StoresSection from "./StoresSection.jsx";
import DealsSection from "./DealsSection.jsx";
import TestimonialsCarousel from "./TestimonialsCarousel.jsx";

/**
 * @param {{ apiUrl: string, testimonials: any[], avgRating: number|null, totalReviews: number }} props
 */
export default function HomeSections({
  apiUrl,
  testimonials = [],
  avgRating,
  totalReviews,
}) {
  return (
    <>
      <StoresSection client:visible apiUrl={apiUrl} />
      <DealsSection client:visible apiUrl={apiUrl} />
      <PopularCategories client:visible apiUrl={apiUrl} />
      <TestimonialsCarousel client:visible
        items={testimonials}
        avgRating={avgRating}
        totalReviews={totalReviews}
      />
    </>
  );
}
