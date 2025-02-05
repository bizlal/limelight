// pages/artists/index.js
import React, { useState } from "react";
import Image from "next/image";
import styles from "./Artists.module.css";

export default function ArtistsPage() {
  // State for each form field
  const [artistName, setArtistName] = useState("");
  const [handle, setHandle] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState(null); // We'll store a File object or null
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can call an API route or show a success message
    alert(`Artist form submitted!\nName: ${artistName}\nHandle: ${handle}`);
    // Then reset or do any other logic
  };

  return (
    <div className={styles.artistsPage}>
      {/* ---------- HERO SECTION ---------- */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Limelight for Artists</h1>
          <p className={styles.heroSubtitle}>
            We’re thrilled that you’re interested in joining Limelight as an
            artist! Please fill out the form below so we can verify your
            identity and get you shining on stage.
          </p>
          <a href="#" className={styles.learnMoreLink}>
            Learn More
          </a>
        </div>
        {/* Example "floating" images (optional) */}
        <div className={styles.floatingImages}>
          <Image
            src="/images/artist1.jpg"
            alt="Artist 1"
            width={60}
            height={60}
            className={styles.floatingImg}
          />
          <Image
            src="/images/artist2.jpg"
            alt="Artist 2"
            width={80}
            height={80}
            className={styles.floatingImg}
          />
          <Image
            src="/images/artist3.jpg"
            alt="Artist 3"
            width={70}
            height={70}
            className={styles.floatingImg}
          />
        </div>
      </header>

      {/* ---------- FORM SECTION ---------- */}
      <main className={styles.formContainer}>
        <form className={styles.artistForm} onSubmit={handleSubmit}>
          {/* REQUIRED FIELDS */}
          <div className={styles.formGroup}>
            <label htmlFor="artistName">Artist Name *</label>
            <input
              type="text"
              id="artistName"
              required
              placeholder="e.g. Snoop Dogg"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="handle">Limelight Handle *</label>
            <div className={styles.handlePrefix}>limelight.xyz/</div>
            <input
              type="text"
              id="handle"
              required
              placeholder="snoopdogg"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location">Location *</label>
            <input
              type="text"
              id="location"
              required
              placeholder="Find location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Avatar Upload */}
          <div className={styles.formGroup}>
            <label htmlFor="avatar">Avatar *</label>
            <div className={styles.avatarUpload}>
              <input
                type="file"
                accept="image/*"
                id="avatar"
                onChange={handleAvatarChange}
                required
              />
              {avatar ? (
                <span>{avatar.name}</span>
              ) : (
                <p>Max 2MB (.jpg, .png, .gif), 800x800px recommended</p>
              )}
            </div>
          </div>

          {/* OPTIONAL INFO */}
          <h3 className={styles.optionalHeading}>Optional Info</h3>

          <div className={styles.formGroup}>
            <label htmlFor="instagram">Instagram</label>
            <div className={styles.socialRow}>
              <button type="button" className={styles.socialConnect}>
                Connect
              </button>
              <input
                type="text"
                id="instagram"
                placeholder="Instagram username or URL"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="twitter">Twitter</label>
            <div className={styles.socialRow}>
              <button type="button" className={styles.socialConnect}>
                Connect
              </button>
              <input
                type="text"
                id="twitter"
                placeholder="Twitter handle or URL"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="spotify">Spotify URL</label>
            <input
              type="url"
              id="spotify"
              placeholder="e.g. https://open.spotify.com/artist/hash"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Submit
          </button>
        </form>
      </main>
    </div>
  );
}
