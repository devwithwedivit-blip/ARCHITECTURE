"use client";

import React, { useEffect, useState } from "react";
import "./azimute.css";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { Footer } from "./footer";
import { Entrance } from "./entrance";
import { PhotoJourney } from "./photo-journey";
import { EssenceSection } from "./essence-section";
import { GallerySection } from "./gallery-section";
import { HelicalCarousel } from "./helical-carousel";
import { PhotoViewerModal } from "./photo-viewer-modal";
import { MotionToggle } from "./motion-toggle";
import { AZIMUTE_MEDIA, MediaItem } from "./media-data";

export function AzimutePage() {
  const [introOpen, setIntroOpen] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState<MediaItem | null>(null);

  // Group items by category
  const interiorItems = AZIMUTE_MEDIA.filter((m) => m.category === "interiors");
  const outdoorItems = AZIMUTE_MEDIA.filter((m) => m.category === "outdoors");
  const livingItems = AZIMUTE_MEDIA.filter((m) => m.category === "living");

  useEffect(() => {
    // Add js and navigation-ready classes to html matching live site scripts
    document.documentElement.classList.add("js", "navigation-ready", "intro-safe");
    return () => {
      document.documentElement.classList.remove("js", "navigation-ready", "intro-safe");
    };
  }, []);

  const openViewer = (item: MediaItem) => {
    setActiveModalItem(item);
  };

  const closeViewer = () => {
    setActiveModalItem(null);
  };

  return (
    <div className="azimute-page-wrapper">
      {/* Background atmosphere layers */}
      <div className="site-atmosphere" aria-hidden="true">
        <div className="site-atmosphere__crystal" />
        <div className="site-atmosphere__veil" />
        <div className="site-atmosphere__light" />
      </div>

      {/* Accessible skip to content link */}
      <a className="skip-link" href="#projeto">
        Ir para o conteúdo
      </a>

      {/* Entrance curtain */}
      <Entrance isOpen={introOpen} onFinish={() => setIntroOpen(false)} />

      {/* Header */}
      <Header />

      <main>
        {/* Section 00: Hero (Scroll-driven Day to Dusk Transition) */}
        <HeroSection />

        {/* Section 01: O Projeto & Interiores */}
        <section className="project" id="projeto" aria-labelledby="project-title">
          <div className="project__intro section-wrap">
            <div className="chapter-label">
              <span>01 / O PROJETO</span>
              <span>VILA VITÓRIA · MAUÁ / SP</span>
            </div>
            <div className="project__heading">
              <h2 className="reveal" id="project-title">
                <span>A VIDA EM</span>
                <em>boa direção.</em>
              </h2>
              <div className="project__description reveal">
                <p>
                  Ambientes que se conectam.
                  <br />
                  Espaço para estar, receber e viver.
                </p>
                <p>
                  Na Vila Vitória, em Mauá, conheça o Azimute: apartamentos com ambientes integrados
                  e varanda gourmet, em um projeto da ASL.
                </p>
                <span className="signature-line">ASL INCORPORADORA E CONSTRUTORA</span>
              </div>
            </div>
          </div>

          {/* Photo Journey 01: Interiores */}
          <PhotoJourney
            id="ambientes"
            chapterLabel="01 / INTERIORES"
            nextChapterHref="#perspectiva"
            className="journey--interiors"
            items={interiorItems}
            onOpenViewer={openViewer}
          />
        </section>

        {/* Section: 3D Helical Carousel / Perspectiva */}
        <HelicalCarousel onOpenViewer={openViewer} />

        {/* Section: Essência */}
        <EssenceSection />

        {/* Section 02: Residências & Facts */}
        <section className="residences section-wrap" id="residencias" aria-labelledby="residences-title">
          <div className="residences__intro">
            <p className="eyebrow">02 / RESIDÊNCIAS</p>
            <h2 className="reveal" id="residences-title">
              O seu espaço.
              <br />
              <em>O seu jeito.</em>
            </h2>
          </div>
          <div className="project__facts">
            <div className="reveal">
              <span>
                63 <i>e</i> 67 <small>m²</small>
              </span>
              <p>Áreas dos apartamentos</p>
            </div>
            <div className="reveal">
              <span>
                2 <small>dormitórios</small>
              </span>
              <p>Com 1 suíte</p>
            </div>
            <div className="reveal">
              <span>
                1 <i>ou</i> 2 <small>vagas</small>
              </span>
              <p>Conforme a unidade</p>
            </div>
          </div>
        </section>

        {/* Section: Outdoor / A céu aberto */}
        <section className="outdoor" aria-labelledby="outdoor-title">
          <div className="outdoor__intro section-wrap">
            <span className="eyebrow">DENTRO & FORA</span>
            <h2 className="reveal" id="outdoor-title">
              Entre a casa
              <br />e o <em>horizonte.</em>
            </h2>
            <p className="outdoor__copy reveal">
              Varanda gourmet com churrasqueira a carvão.
              <br />
              Espaço para receber e deixar os encontros acontecerem.
            </p>
          </div>

          {/* Photo Journey 02: Terracos / Ao ar livre */}
          <PhotoJourney
            id="terracos"
            chapterLabel="02 / A CÉU ABERTO"
            nextChapterHref="#encontros"
            className="journey--outdoors"
            items={outdoorItems}
            onOpenViewer={openViewer}
          />
        </section>

        {/* Section 03: Convivência / Encontros */}
        <section className="living-chapter" id="encontros" aria-labelledby="living-title">
          <div className="living-intro section-wrap">
            <div>
              <p className="eyebrow">03 / ENCONTROS</p>
              <h2 id="living-title">
                A vida encontra
                <br />
                <em>seu lugar.</em>
              </h2>
            </div>
            <p>
              Luz, verde e matéria. Percorra as perspectivas e descubra os detalhes dos ambientes.
            </p>
          </div>

          {/* Photo Journey 03: Convivência */}
          <PhotoJourney
            id="convivencia"
            chapterLabel="03 / CONVIVÊNCIA"
            nextChapterHref="#espacos"
            className="journey--living"
            items={livingItems}
            onOpenViewer={openViewer}
          />
        </section>

        {/* Section 04: Espaços & Galeria */}
        <GallerySection onOpenViewer={openViewer} />
      </main>

      {/* Footer with Contact CTA */}
      <Footer onReplayIntro={() => setIntroOpen(true)} />

      {/* Lightbox Photo Viewer Modal */}
      <PhotoViewerModal
        item={activeModalItem}
        isOpen={Boolean(activeModalItem)}
        onClose={closeViewer}
      />

      {/* Accessibility Motion Toggle */}
      <MotionToggle />
    </div>
  );
}
