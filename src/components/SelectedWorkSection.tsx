import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Project } from '../types';
import { RollingNumber } from './TypewriterEffects';
import { DomSyncWebGL, DomSyncProjectSpec } from './DomSyncWebGL';
import { ProjectLogoReveal } from './ProjectLogoReveal';

gsap.registerPlugin(ScrollTrigger);

interface SelectedWorkSectionProps {
  onSelectProject: (project: Project) => void;
  theme?: 'light' | 'dark';
}

interface WorkItem extends Project {
  imageSrc: string;
  hoverImageSrc: string;
  indexCode: string;
  shortLabel: string;
}

export const PROJECTS_DATA: WorkItem[] = [
  {
    id: 'nurabi',
    indexCode: '3/2',
    title: 'NURABI',
    arabicTitle: 'نُربّي',
    shortLabel: 'EGYPTIAN CURRICULUM EDTECH',
    category: 'EDUCATION APP WEBSITE',
    years: '2025-2027',
    tagline: 'منصتك التعليمية لشرح المناهج المصرية من الابتدائي للثانوي العام',
    description:
      'منصة تعليمية متكاملة مصممة لطلاب المدارس المصرية من المرحلة الابتدائية وحتى الثانوية العامة، تجمع بين الحصص التفاعلية المباشرة، حجز مواعيد المدرسين، ومتابعة تقدم الطالب في كل مادة.',
    writtenNarrative:
      'نُربّي هو موقع تعليمي مصري متكامل لطلاب الابتدائي والإعدادي والثانوي العام. صممنا فيه نظام حجز مواعيد الحصص الفردية والجماعية، وجداول المراجعة الأسبوعية، وبث مباشر واضح بدون تشتيت عشان كل طالب يذاكر بالنظام والميعاد اللي يناسب مستواه.',
    tags: ['Egyptian K-12', 'RTL Typography', 'Live Tutoring', 'Schedule System'],
    role: 'Lead UI/UX & Design Systems',
    scheduleTiles: [
      { label: 'ميعاد الإطلاق', value: 'SEP 2025 — Q4 2027' },
      { label: 'المراحل الدراسية', value: 'ابتدائي · إعدادي · ثانوي عام' },
      { label: 'نظام المواعيد', value: 'حصص لايف بجدول أسبوعي مرن' },
      { label: 'حالة المنصة', value: 'LIVE · +350K طالب' },
    ],
    workflowSteps: [
      {
        code: '01',
        title: 'اختيار المرحلة والمنهج',
        detail: 'تحديد الصف الدراسي من أولى ابتدائي لحد تالتة ثانوي عام وفق توزيع وزارة التربية والتعليم.',
      },
      {
        code: '02',
        title: 'تحديد الميعاد والمدرس',
        detail: 'عرض جدول المواعيد المتاحة لكل مدرس وحجز الحصة المناسبة بتأكيد فوري وتنبيه قبل الموعد.',
      },
      {
        code: '03',
        title: 'الفصل التفاعلي والمتابعة',
        detail: 'دخول قاعة الشرح المباشر مع سبورة تفاعلية، ملخصات PDF، وتقارير مستوى مستمرة لولي الأمر.',
      },
    ],
    deliverables: [
      'هيكل المنصة التعليمية للمناهج المصرية',
      'نظام جدولة وحجز المواعيد الذكي',
      'تجربة قاعة الشرح المباشر والاختبارات',
      'هوية بصرية وخط عربي مخصص (نُربّي)',
    ],
    metrics: ['+140% Booking Conversion', '4.9★ Tutor Satisfaction', '350K+ Monthly Learners'],
    colorTheme: 'from-[#0b3b60] via-[#092947] to-[#041526]',
    accentBg: '#092b4a',
    previewType: 'arabic-edtech',
    imageSrc: '/assets/aistudio/Arabic_Blue_Online_Learning_Platform_2c685461.png',
    hoverImageSrc: '/assets/aistudio/Arabic_Calligraphy_and_Geometric_Emblem_1c258821.png',
    behanceCaseStudyUrl:
      'https://www.behance.net/gallery/256925003/Nurabi-Arabic-Education-platform-Case-Study',
    extraGallery: [
      {
        src: '/assets/aistudio/nurabi_education_types.png',
        alt: 'Nurabi — Egyptian & International School Education Curricula (المناهج الدراسية)',
        captionLeft: 'NURABI // KIND OF SCHOOL EDUCATION',
        captionRight: 'المناهج الدراسية',
      },
      {
        src: '/assets/aistudio/nurabi_testimonials.png',
        alt: 'Nurabi — Parent & Student Testimonials (كلام الناس عنا)',
        captionLeft: 'NURABI // TESTIMONIALS',
        captionRight: 'كلام الناس عنا',
      },
    ],
  },
  {
    id: 'rivka',
    indexCode: '3/3',
    title: 'RIVKA',
    arabicTitle: 'رفقة',
    shortLabel: 'WILDERNESS CAMPS & OASES',
    category: 'TRAVEL APP',
    years: '2025-2026',
    tagline: 'كامبات هادئة للدراسة والسياحة والتجمع في الصحراء وسيوة والبحر',
    description:
      'تطبيق رفقة مخصص لاستكشاف وحجز الكامبات في الأماكن الهادئة بعيداً عن الزحام، مثل سيوة والصحراء البيضاء والشواطئ البعيدة، لتنظيم رحلات الدراسة والسياحة والتجمعات الهادفة.',
    writtenNarrative:
      'رفقة هو دليل وتطبيق لحجز وتنظيم الكامبات في المناطق الصحراوية والبحرية الهادئة وفي الواحات زي سيوة. هدفنا نقرب الناس من الأماكن الهادية عبر معسكرات متخصصة للدراسة، السياحة، أو التجمع مع ناس بتشاركهم نفس الاهتمامات بعيد عن صخب المدينة.',
    tags: ['Siwa & Desert', 'Study Camps', 'Community Retreats', 'Offline GPS'],
    role: 'Principal Mobile Product Designer',
    scheduleTiles: [
      { label: 'ميعاد المواسم', value: 'OCT 2025 — MAY 2026' },
      { label: 'نطاق الكامبات', value: 'سيوة · الصحراء · بحر هادئ' },
      { label: 'أنواع التجمعات', value: 'كامب دراسة · سياحة · تجمع' },
      { label: 'حالة التطبيق', value: 'IOS & ANDROID · 85K' },
    ],
    workflowSteps: [
      {
        code: '01',
        title: 'استكشاف الأماكن الهادئة',
        detail: 'اختيار الوجهة حسب الهدوء والكثافة السكانية بين سيوة، الصحراء، أو الشواطئ المعزولة.',
      },
      {
        code: '02',
        title: 'ميعاد ونوع الكامب',
        detail: 'تصفح مواعيد أفواج الكامبات المخصصة للدراسة الهادئة، التأمل السياحي، أو التجمعات الجماعية.',
      },
      {
        code: '03',
        title: 'خريطة المسار والتجمع',
        detail: 'مزامنة الإحداثيات وخرائط أوفلاين آمنة للوصول للكامب والتواصل مع منظمي المكان والمجموعة.',
      },
    ],
    deliverables: [
      'تجربة حجز الكامبات الدراسية والسياحية',
      'خرائط صحراوية تعمل بدون إنترنت',
      'تقويم مواعيد الأفواج والمواسم المناخية',
      'نظام التحقق من المضيفة والمخيمات',
    ],
    metrics: ['85K Active Campers', '4.8★ App Store Rating', '98% Positive Host Sentiment'],
    colorTheme: 'from-[#be976b] via-[#a3794f] to-[#7a5530]',
    accentBg: '#96714a',
    previewType: 'desert-app',
    imageSrc: '/assets/aistudio/Rivka_Desert_App_Showcase_0c2aebe6.png',
    hoverImageSrc: '/assets/aistudio/rivka_a6cdcbf7.png',
  },
  {
    id: 'tawreed',
    indexCode: '3/4',
    title: 'TAWREEDAT',
    arabicTitle: 'توريدات',
    shortLabel: 'B2B SUPPLY CHAIN & GPS TRACKING',
    category: 'B2B PLATFORM',
    years: '2025-2026',
    tagline: 'منصة B2B لربط الشركات والموردين وتتبع التوريدة لحظياً من العقد للاستلام',
    description:
      'موقع B2B يربط الشركات المشترية بالمصانع والموردين في مصر، ويدير دورة التوريد كاملة بدءاً من توقيع العقد الإلكتروني وحتى متابعة الشحنة على الخريطة ومعرفة إحداثياتها ومرحلتها لحظة بلحظة حتى التسليم.',
    writtenNarrative:
      'توريدات هي منصة B2B متكاملة بتوصل شركات التوريد والمصانع بالمشترين في مكان واحد. الرحلة بتبدأ من إبرام العقد وتحديد المواصفات والكميات، وتستمر بتتبع الشحنة لحظياً على الخريطة عشان تعرف إحداثياتها فين بالظبط دلوقتي وفي أي مرحلة من التحضير أو الشحن لحد ما تستلم التوريدة بالكامل وتأكد وصولها.',
    tags: ['B2B Marketplace', 'Digital Contracts', 'Live GPS Coordinates', 'Logistics Stage'],
    role: 'Lead Product & Dashboard Architect',
    scheduleTiles: [
      { label: 'ميعاد التنفيذ', value: 'JAN 2025 — 2026' },
      { label: 'دورة العقد', value: 'تعاقد رقمي وتوثيق فوري' },
      { label: 'التتبع والإحداثيات', value: 'GPS حي + حالة كل مرحلة' },
      { label: 'نطاق الشبكة', value: 'مصانع وموردو مصر B2B' },
    ],
    workflowSteps: [
      {
        code: '01',
        title: 'الربط وتوقيع العقد',
        detail: 'مطابقة المشتري مع المورد المعتمد واعتماد بنود العقد والأسعار وميعاد التوريد المتفق عليه.',
      },
      {
        code: '02',
        title: 'مراقبة مراحل التجهيز والشحن',
        detail: 'عرض المرحلة الحالية للشحنة لحظياً: التجهيز في المصنع، التحميل، الفحص، والانطلاق على الطريق.',
      },
      {
        code: '03',
        title: 'الإحداثيات الحية والاستلام',
        detail: 'تحديد إحداثيات الشحنة الدقيقة على خريطة لوحة التحكم في أي لحظة حتى إثبات التسليم النهائي للمشتري.',
      },
    ],
    deliverables: [
      'بوابة سوق المصانع والموردين (B2B)',
      'لوحة تتبع الإحداثيات الحية GPS والخط الزمني',
      'تدفق التعاقدات الرقمية ومحاضر الاستلام',
      'نظام فلاتر الموردين بالمناطق والخرائط',
    ],
    metrics: ['100% Live Route Visibility', '18,400+ Active B2B Orders', '3.4x Faster Contracting'],
    colorTheme: 'from-[#3b0d16] via-[#24131c] to-[#111827]',
    accentBg: '#5e1424',
    previewType: 'tawreed-b2b',
    imageSrc: '/assets/aistudio/hook_70c6e796.png',
    hoverImageSrc: '/assets/aistudio/Modern_Arabic_Supplier_Marketplace_Dashboard_508fd2df.png',
    showcaseVideo: {
      src: '/assets/aistudio/web_8d385e24.mp4',
      captionLeft: 'TAWREEDAT // FULL SITE MOTION',
      captionRight: 'الحركة والتفاعل الحي',
    },
    extraGallery: [
      {
        src: '/assets/aistudio/tawreed_hero_dashboard.png',
        alt: 'Tawreedat — Hero, Control Dashboard & Verified Factory Logos',
        captionLeft: 'TAWREEDAT // HERO & CONTROL DASHBOARD',
        captionRight: 'كل مصانع مصر في إيدك',
      },
      {
        src: '/assets/aistudio/tawreed_features.png',
        alt: 'Tawreedat — Six Core B2B Procurement & Tracking Capabilities',
        captionLeft: 'TAWREEDAT // CORE B2B CAPABILITIES',
        captionRight: 'مميزات المنصة والتتبع',
      },
      {
        src: '/assets/aistudio/tawreed_metrics_partners.png',
        alt: 'Tawreedat — Live Network Metrics & Success Partners Testimonials',
        captionLeft: 'TAWREEDAT // METRICS & PARTNERS',
        captionRight: 'شركئنا في نجاح',
      },
      {
        src: '/assets/aistudio/tawreed_pricing.png',
        alt: 'Tawreedat — Supplier Subscription Plans (Free, Pro, Premium)',
        captionLeft: 'TAWREEDAT // SUBSCRIPTION PLANS',
        captionRight: 'الاشتراكات والباقات',
      },
      {
        src: '/assets/aistudio/tawreed_faq_footer.png',
        alt: 'Tawreedat — Frequently Asked Questions & Footer Architecture',
        captionLeft: 'TAWREEDAT // FAQ & FOOTER',
        captionRight: 'الأسئلة الشائعة',
      },
    ],
  },
];

export function SelectedWorkSection({ onSelectProject, theme = 'dark' }: SelectedWorkSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageBoxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [webglReady, setWebglReady] = useState(false);

  const projectSpecs: DomSyncProjectSpec[] = useMemo(
    () =>
      PROJECTS_DATA.map((project) => ({
        id: project.id,
        imageSrc: project.imageSrc,
        hoverImageSrc: project.hoverImageSrc,
      })),
    []
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headerTween = gsap.fromTo(
        '[data-work-header]',
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          paused: true,
        }
      );

      ScrollTrigger.create({
        trigger: '[data-work-header]',
        start: 'top 92%',
        end: 'bottom 8%',
        onEnter: () => headerTween.restart(),
        onLeave: () => headerTween.reverse(),
        onEnterBack: () => headerTween.restart(),
        onLeaveBack: () => headerTween.reverse(),
      });

      cardRefs.current.forEach((cardEl) => {
        if (!cardEl) return;

        const enterTween = gsap.fromTo(
          cardEl,
          { y: 36, scale: 0.985, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            paused: true,
          }
        );

        ScrollTrigger.create({
          trigger: cardEl,
          start: 'top 95%',
          end: 'bottom top',
          onEnter: () => enterTween.play(),
          onEnterBack: () => enterTween.play(),
          onLeaveBack: () => enterTween.reverse(),
        });
      });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const handleCardClick = (project: WorkItem) => {
    onSelectProject(project);
  };

  return (
    <section
      id="work"
      ref={sectionRef}
      className="w-full py-20 sm:py-28 px-6 sm:px-12 lg:px-20 relative z-10"
    >
      {/* DOM-Synced WebGL Shader Canvas (renders BOTH idle & hovered states with unbroken 3D curl & scroll shade) */}
      <DomSyncWebGL
        projects={projectSpecs}
        imageBoxRefs={imageBoxRefs}
        cardRefs={cardRefs}
        hoveredId={hoveredId}
        theme={theme}
        onReadyChange={setWebglReady}
      />

      <div className="max-w-5xl mx-auto relative z-20">
        {/* Section Header */}
        <div data-work-header className="flex items-baseline justify-between mb-14 sm:mb-20 relative z-20">
          <h2 data-scroll-shade className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase font-sans will-change-transform">
            SELECTED WORK
          </h2>
          <span data-scroll-shade className="font-pixel text-xs sm:text-sm font-semibold opacity-75 tracking-tight shrink-0 inline-flex items-baseline will-change-transform">
            <span>//</span>
            <RollingNumber value="02" />
          </span>
        </div>

        {/* Alternating One-by-One Rectangular Sequence: Left -> Right -> Left */}
        <div data-scroll-shift className="relative z-20 flex flex-col space-y-14 sm:space-y-20 will-change-transform">
          {PROJECTS_DATA.map((project, idx) => {
            const isLeft = idx % 2 === 0;
            const isHovered = hoveredId === project.id;
            const fallbackZoomClass = isHovered ? 'scale-[1.05]' : 'scale-100';

            return (
              <div
                key={project.id}
                id={`project-${project.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Open ${project.title} (${project.arabicTitle}) case study`}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                onClick={() => handleCardClick(project)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(project);
                  }
                }}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group w-full md:w-[68%] lg:w-[64%] cursor-pointer select-none will-change-transform text-left focus:outline-none ${
                  isLeft ? 'md:self-start' : 'md:self-end'
                }`}
              >
                {/* Sharp 0px-Radius Rectangular Image Frame — zero overlay clutter inside */}
                <div
                  ref={(el) => {
                    imageBoxRefs.current[idx] = el;
                  }}
                  className="relative w-full aspect-[16/10] overflow-hidden rounded-none bg-transparent"
                >
                  {/* HTML Fallback (only visible when WebGL isn't active) */}
                  {!webglReady && (
                    <>
                      <img
                        src={project.imageSrc}
                        alt={`${project.title} — ${project.category}`}
                        className={`w-full h-full object-cover rounded-none transition-transform duration-500 ease-out ${fallbackZoomClass}`}
                      />
                      <ProjectLogoReveal
                        title={project.title}
                        hoverImageSrc={project.hoverImageSrc}
                        isHovered={isHovered}
                      />
                    </>
                  )}
                </div>

                {/* Below Image (Outside Image Frame): Project Name & Date */}
                <div data-scroll-shade className="mt-3 flex items-baseline justify-between gap-4 will-change-transform">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-sm sm:text-base font-bold tracking-tight uppercase font-sans transition-opacity duration-200 group-hover:opacity-80">
                      {project.title}
                    </h3>
                    <span className="text-xs font-medium opacity-65" dir="rtl">
                      {project.arabicTitle}
                    </span>
                  </div>
                  <span className="font-pixel text-[11px] sm:text-xs opacity-70 tabular-nums shrink-0">
                    {project.years}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quiet Unboxed Helper Caption */}
        <div data-scroll-shade className="mt-14 flex items-center justify-center gap-2 text-[10px] font-pixel opacity-60 relative z-20 will-change-transform">
          <span>+</span>
          <span>CLICK ANY PROJECT TO INSPECT CASE STUDY</span>
        </div>
      </div>
    </section>
  );
}
