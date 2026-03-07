import headmasterImg from "@/assets/headmaster.jpg";

const HeadmasterSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">A Fountain of Wisdom</h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-10 items-start max-w-5xl mx-auto">
          <div className="relative">
            <img
              src={headmasterImg}
              alt="Mr. Nyabako - Head Master"
              className="w-full rounded-2xl shadow-card-hover object-cover aspect-square"
            />
            <div className="absolute -top-4 -left-4 text-7xl font-display text-secondary opacity-40 select-none">"</div>
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold text-primary mb-1">Mr. Nyabako</h3>
            <p className="font-body text-secondary font-semibold mb-6">Head Master</p>

            <blockquote className="font-body text-muted-foreground space-y-4 border-l-4 border-secondary pl-6">
              <p className="italic leading-relaxed">
                St. Mary's High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.
              </p>
              <p className="leading-relaxed">
                Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.
              </p>
              <p className="leading-relaxed">
                As we stand guided by our motto: <strong>"We Think We Can and Indeed We Can"</strong> — I invite you to join our community where excellence is not just a goal, but a way of life.
              </p>
            </blockquote>

            <div className="mt-6 font-body">
              <p className="font-semibold text-foreground">Mr. Nyabako</p>
              <p className="text-sm text-muted-foreground">Head Master, St. Mary's High School</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadmasterSection;
