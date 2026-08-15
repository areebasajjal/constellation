import Link from "next/link";

export default function LandingPage() {
  return (

    <main className="landing-page">

      <div className="star star-1 star-bright"></div>

      <div className="star star-2"></div>
      <div className="star star-3"></div>

      <div className="star star-4 star-bright"></div>

      <div className="star star-5"></div>
      <div className="star star-6"></div>
      <div className="star star-7"></div>
      <div className="star star-8"></div>


      <section className="hero-content">

        <div className="hero-symbol">✦</div>

           <p className="hero-kicker">
              Shared signals. Human connection.
                     </p>

              <h1> CONSTELLATION </h1>

             <h2 className="hero-title">
                See what your community
              <br/>
                is carrying together.
        </h2>


        <Link href="/Constellationspace" className="hero-button">
          Enter the constellation

          <span className="hero-button-arrow">
            →
          </span>
        </Link>

      </section>

    </main>
  );
}