import { GridCrosshair } from './GridCrosshair';

export function SubheadGridRow() {
  return (
    <section className="w-full relative grid-border-b">
      {/* 3-Column Structural Grid Row Matching image_5c2653cd.png */}
      <div className="grid grid-cols-12 min-h-[130px] sm:min-h-[160px] relative">
        {/* Column 1: "Design & Engineering" */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3 px-5 sm:px-8 py-6 sm:py-8 grid-border-r relative flex flex-col justify-start">
          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-[#111111] dark:text-neutral-100 leading-tight">
            Design &amp;
            <br />
            Engineering
          </h2>
          <span className="text-[11px] font-mono-code text-neutral-500 mt-2">
            PRODUCT &amp; UI SYSTEMS
          </span>

          {/* Far Left + marker */}
          <GridCrosshair position="bottom-left" />
          {/* Intersection + marker between Col 1 & 2 */}
          <GridCrosshair position="bottom-right" />
        </div>

        {/* Column 2: "Thinking in systems. Designing with care." */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 px-5 sm:px-8 py-6 sm:py-8 grid-border-r relative flex flex-col justify-start font-mono-code text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
          <p className="leading-relaxed">
            Thinking in systems.
            <br />
            Designing with care.
          </p>
          <p className="text-[11px] text-neutral-500 mt-3 font-mono-code">
            LAT: 30.0444° N, 31.2357° E
          </p>

          {/* Intersection + marker between Col 2 & 3 */}
          <GridCrosshair position="bottom-right" />
        </div>

        {/* Column 3: Bio Prose exactly matching format of image_5c2653cd.png */}
        <div className="col-span-12 md:col-span-5 lg:col-span-5 px-5 sm:px-8 py-6 sm:py-8 relative flex flex-col justify-start text-xs sm:text-sm font-mono-code text-neutral-700 dark:text-neutral-300">
          <p className="leading-relaxed max-w-xl">
            I'm Moamen, leading Product &amp; UI Design, Design Engineering and spatial exploration at scale. Outside work, I craft high-performance design tools, 3D shaders, and Arabesque typography systems.
          </p>

          {/* Far Right + marker */}
          <GridCrosshair position="bottom-right" />
        </div>
      </div>
    </section>
  );
}
