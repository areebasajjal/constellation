export default function SpacesPage() {
  return (
    <main className="space-page">

      <section className="space-content">
      <div className="star star-1 star-bright"></div>

      <div className="star star-2"></div>

      <div className="star star-77"></div>


        <p className="space-kicker">
          ENTER THE CONSTELLATION
        </p>

        <h1>Find your space.</h1>

        <div className="space-options">

          <div className="space-option">

            <h2>Join a Space</h2>

            <p>
              Enter a space code shared by your community.
            </p>

            <input
              type="text"
              placeholder="e.g. GIRLIES26"/>

            <button>
              Join space →
            </button>
          </div>

          <div className="space-option">

            <h2>Create a Space</h2>

            <p>
              Start a new constellation for your group.
            </p>

            <input
              type="text"
              placeholder="Name your space"
            />

            <button>
              Create space →
            </button>
          </div>

        </div>

      </section>

    </main>
  );
}