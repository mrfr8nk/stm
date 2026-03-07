import galleryLab from "@/assets/gallery-lab.jpg";
import gallerySports from "@/assets/gallery-sports.jpg";
import galleryScience from "@/assets/gallery-science.jpg";
import aboutSchool from "@/assets/about-school.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import headmaster from "@/assets/headmaster.jpg";

const galleryItems = [
  { img: galleryLab, title: "Computer Lab", desc: "Advanced IT lab with latest technology" },
  { img: gallerySports, title: "Athletics Program", desc: "Championship-winning sports teams" },
  { img: galleryScience, title: "Science Lab", desc: "Students conducting experiments" },
  { img: aboutSchool, title: "Interactive Learning", desc: "Modern learning spaces" },
  { img: heroBg, title: "Beautiful Campus", desc: "Our expansive learning environment" },
  { img: headmaster, title: "Leadership", desc: "Developing future leaders" },
];

const GallerySection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">School Environment</h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleryItems.map((item) => (
            <div key={item.title} className="relative group rounded-xl overflow-hidden h-64 cursor-pointer">
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="font-display text-lg font-bold text-primary-foreground translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {item.title}
                </h3>
                <p className="font-body text-primary-foreground/80 text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
