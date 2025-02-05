import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaSpotify, FaApple } from "react-icons/fa";
import styles from "./NewRelease.module.css";
import { useCurrentUser } from "@/lib/user";
// Placeholder: Upload file to Firebase, returns a URL
async function uploadFileToFirebase(file) {
  // Implement your real logic here
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("https://firebase.storage.com/mybucket/" + file.name);
    }, 1200);
  });
}

// Placeholder: Insert release into your Mongo DB
async function insertReleaseToDB(releaseData) {
  return fetch("/api/insertRelease", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(releaseData),
  }).then((r) => r.json());
}

/**
 * Row to display a file + remove button
 */
function FileItem({ file, onRemove }) {
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!file) return;
    // If audio/video, parse duration
    if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setDuration(video.duration);
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        setDuration(null);
        URL.revokeObjectURL(url);
      };
      video.src = url;
    }
  }, [file]);

  if (!file) return null;
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <li className={styles.fileItem}>
      <span>
        {file.name} — {sizeMB} MB
        {duration != null && ` — ${duration.toFixed(2)}s`}
      </span>
      <button className={styles.removeBtn} onClick={onRemove}>
        ✕
      </button>
    </li>
  );
}

/**
 * Left Column:
 *  - Master File
 *  - Cover Art
 *  - plus (artist, featured_artists, writing_credits, producing_credits)
 */
function LeftColumn({
  artist,
  setArtist,
  featuredArtists,
  setFeaturedArtists,
  writingCredits,
  setWritingCredits,
  producingCredits,
  setProducingCredits,
  masterFile,
  setMasterFile,
  coverArtFile,
  setCoverArtFile,
}) {
  const handleMasterChange = (e) => {
    const f = e.target.files?.[0];
    if (f && (f.type.startsWith("audio/") || f.type.startsWith("video/"))) {
      setMasterFile(f);
    }
  };
  const removeMaster = () => setMasterFile(null);

  const handleCoverArtChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setCoverArtFile(f);
    }
  };
  const removeCoverArt = () => setCoverArtFile(null);

  return (
    <div className={styles.leftSide}>
      <h3 className={styles.leftTitle}>Artist & Credits</h3>
      <div className={styles.fieldGroup}>
        <label>Artist</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Artist name"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label>Featured Artists</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Featured artists"
          value={featuredArtists}
          onChange={(e) => setFeaturedArtists(e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label>Writing Credits</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Writing credits"
          value={writingCredits}
          onChange={(e) => setWritingCredits(e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label>Producing Credits</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Producing credits"
          value={producingCredits}
          onChange={(e) => setProducingCredits(e.target.value)}
        />
      </div>

      <hr className={styles.separator} />

      <h3 className={styles.leftTitle}>Master Audio File</h3>
      <input
        className={styles.input}
        type="file"
        accept="audio/*,video/*"
        onChange={handleMasterChange}
      />
      {masterFile && (
        <ul className={styles.fileList}>
          <FileItem file={masterFile} onRemove={removeMaster} />
        </ul>
      )}

      <hr className={styles.separator} />

      <h3 className={styles.leftTitle}>Cover Art</h3>
      <input
        className={styles.input}
        type="file"
        accept="image/*"
        onChange={handleCoverArtChange}
      />
      {coverArtFile && (
        <ul className={styles.fileList}>
          <FileItem file={coverArtFile} onRemove={removeCoverArt} />
        </ul>
      )}
    </div>
  );
}

/**
 * Main multi-step form
 */
export default function NewRelease() {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  // ========== NEW: Shazam Track Search State ==========
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Holds the currently selected track's info for preview
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Basic release schema
  const [release, setRelease] = useState({
    metadata: {
      track_title: "",
      album_title: "",
      language: "",
      release_type: "single",
      isrc: "",
      bpm: 0,
      artist: "",
      featured_artists: "",
      writing_credits: "",
      producing_credits: "",
    },
    is_instrumental: false,
    is_explicit: false,
    dsp_links: {
      spotify: "",
      apple_music_url: "",
    },
    release_location: {
      city: "",
      state: "",
      country: "",
    },
    is_active: true,
    // other fields from your schema ...
    audio_url: "",
    image_url: "",
  });

  // Files
  const [masterFile, setMasterFile] = useState(null);
  const [coverArtFile, setCoverArtFile] = useState(null);

  // For the left column "artist" fields
  const [artist, setArtist] = useState("");
  const [featuredArtists, setFeaturedArtists] = useState("");
  const [writingCredits, setWritingCredits] = useState("");
  const [producingCredits, setProducingCredits] = useState("");

  // Progress bar
  const totalSteps = 5;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  const nextStep = () =>
    setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  const prevStep = () => setStepIndex((prev) => Math.max(0, prev - 1));

  // =================
  // Search function
  // =================
  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedTrack(null); // reset previous selection
    try {
      const response = await axios.get(
        "https://shazam-api6.p.rapidapi.com/shazam/search_track/",
        {
          params: { query: searchQuery, limit: "10" },
          headers: {
            // Replace with your own RapidAPI credentials
            "x-rapidapi-key":
              "9391c1e74fmsh37008868797f7bap1aae4djsnf4d43714c835",
            "x-rapidapi-host": "shazam-api6.p.rapidapi.com",
          },
        }
      );
      const { data } = response;
      console.log("Shazam search results:", data);
      setSearchResults(data?.result?.tracks?.hits || []);
    } catch (err) {
      console.error("Shazam search error:", err);
      alert("Error searching for track, see console.");
    }
    setIsSearching(false);
  };

  // =================
  // Select a track
  // =================
  const handleSelectTrack = (trackObj) => {
    // If your actual data is nested differently, adjust accordingly
    const newReleaseData = {
      ...release,
      metadata: {
        ...release.metadata,
        track_title: trackObj.heading?.title || "",
        artist: trackObj.heading?.subtitle || "",
      },
      audio_url: trackObj.previewurl || "",
      image_url:
        trackObj.images?.coverart ||
        trackObj.images?.default ||
        trackObj.coverarturl ||
        "",
    };

    setRelease(newReleaseData);

    // Update left-column "artist" so it’s visible in that input
    setArtist(trackObj.heading?.subtitle || "");

    // Keep track so we can show the horizontal preview row
    setSelectedTrack({
      title: trackObj.heading?.title || "",
      artist: trackObj.heading?.subtitle || "",
      audioUrl: trackObj.stores?.apple?.previewurl || trackObj.previewurl || "",
      coverUrl:
        trackObj.images?.coverart ||
        trackObj.images?.default ||
        trackObj.coverarturl ||
        "",
    });
  };

  // =================
  // Finish
  // =================
  // Replace this function to call the new API
  async function submitNewTrack(track) {
    return axios
      .post("/api/track/", track)
      .then((response) => response.data)
      .catch((err) => {
        console.error("API Error:", err);
        throw err;
      });
  }

  const { data, error, mutate } = useCurrentUser();

  // Update handleFinish function
  const handleFinish = async () => {
    try {
      // 1) Construct the `track` object from form inputs
      const track = {
        uid: data?.user.uid,
        track_title: release.metadata.track_title,
        album_title: release.metadata.album_title,
        language: release.metadata.language,
        release_type: release.metadata.release_type,
        isrc: release.metadata.isrc,
        bpm: release.metadata.bpm,
        artist,
        featured_artists: featuredArtists.split(",").map((a) => a.trim()),
        writing_credits: writingCredits.split(",").map((w) => w.trim()),
        producing_credits: producingCredits.split(",").map((p) => p.trim()),
        is_instrumental: release.is_instrumental,
        is_explicit: release.is_explicit,
        dsp_links: {
          spotify: release.dsp_links.spotify,
          apple_music_url: release.dsp_links.apple_music_url,
        },
        release_location: {
          city: release.release_location.city,
          state: release.release_location.state,
          country: release.release_location.country,
        },
        audio_url: masterFile
          ? await uploadFileToFirebase(masterFile)
          : release.audio_url,
        image_url: coverArtFile
          ? await uploadFileToFirebase(coverArtFile)
          : release.image_url,
      };

      // 2) Call the new API with the constructed `track` object
      const result = await submitNewTrack({ track });
      console.log("API Response:", result);

      setDone(true);
    } catch (err) {
      console.error("Error during submission:", err);
      alert("Failed to submit release. See console for details.");
    }
  };
  // Done screen
  if (done) {
    return (
      <div className={styles.root}>
        <div className={styles.main}>
          <div className={styles.formCard}>
            <div className={styles.doneMessage}>
              <h2>All done!</h2>
              <p>Your new release has been submitted!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============
  // Multi-Step Form
  // ===============
  let RightSideContent = null;
  if (stepIndex === 0) {
    // Step 1
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 1: Basic Info</h2>
        <div className={styles.fieldGroup}>
          <label>Track Title</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Track title"
            value={release.metadata.track_title}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: {
                  ...prev.metadata,
                  track_title: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Album Title</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Album name (if any)"
            value={release.metadata.album_title}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: {
                  ...prev.metadata,
                  album_title: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Language</label>
          <input
            className={styles.input}
            type="text"
            placeholder="e.g. English"
            value={release.metadata.language}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: {
                  ...prev.metadata,
                  language: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Release Type</label>
          <select
            className={styles.select}
            value={release.metadata.release_type}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: {
                  ...prev.metadata,
                  release_type: e.target.value,
                },
              }))
            }
          >
            <option value="single">Single</option>
            <option value="remix">Remix</option>
            <option value="instrumental">Instrumental</option>
          </select>
        </div>
        <div className={styles.checkGroup}>
          <input
            type="checkbox"
            checked={release.is_instrumental}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                is_instrumental: e.target.checked,
              }))
            }
          />
          <label>Instrumental?</label>
        </div>
        <div className={styles.checkGroup}>
          <input
            type="checkbox"
            checked={release.is_explicit}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                is_explicit: e.target.checked,
              }))
            }
          />
          <label>Explicit?</label>
        </div>

        <div className={styles.stepNav}>
          <button className={styles.button} disabled>
            Back
          </button>
          <button className={styles.button} onClick={nextStep}>
            Next
          </button>
        </div>
      </div>
    );
  } else if (stepIndex === 1) {
    // Step 2
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 2: Track Details</h2>
        <div className={styles.fieldGroup}>
          <label>ISRC</label>
          <input
            className={styles.input}
            type="text"
            placeholder="ISRC code"
            value={release.metadata.isrc}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: { ...prev.metadata, isrc: e.target.value },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>BPM</label>
          <input
            className={styles.input}
            type="number"
            placeholder="e.g. 120"
            value={release.metadata.bpm || ""}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: { ...prev.metadata, bpm: Number(e.target.value) },
              }))
            }
          />
        </div>

        <div className={styles.stepNav}>
          <button className={styles.button} onClick={prevStep}>
            Back
          </button>
          <button className={styles.button} onClick={nextStep}>
            Next
          </button>
        </div>
      </div>
    );
  } else if (stepIndex === 2) {
    // Step 3
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 3: Release Date & DSP</h2>
        <div className={styles.fieldGroup}>
          <label>Release Date</label>
          <input
            className={styles.input}
            type="date"
            onChange={(e) => {
              const timeVal = new Date(e.target.value).getTime();
              setRelease((prev) => ({
                ...prev,
                metadata: { ...prev.metadata, release_date: timeVal },
              }));
            }}
          />
        </div>
        <div className={styles.checkGroup}>
          <input
            type="checkbox"
            checked={release.is_active}
            onChange={(e) =>
              setRelease((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
          <label>Is Active?</label>
        </div>
        <div className={styles.fieldGroup}>
          <label>
            <FaSpotify style={{ marginRight: "6px" }} />
            Spotify DSP Link
          </label>
          <input
            className={styles.input}
            type="text"
            placeholder="https://open.spotify.com/..."
            value={release.dsp_links.spotify}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                dsp_links: { ...prev.dsp_links, spotify: e.target.value },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>
            <FaApple style={{ marginRight: "6px" }} />
            Apple Music DSP Link
          </label>
          <input
            className={styles.input}
            type="text"
            placeholder="https://music.apple.com/..."
            value={release.dsp_links.apple_music_url}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                dsp_links: {
                  ...prev.dsp_links,
                  apple_music_url: e.target.value,
                },
              }))
            }
          />
        </div>

        <div className={styles.stepNav}>
          <button className={styles.button} onClick={prevStep}>
            Back
          </button>
          <button className={styles.button} onClick={nextStep}>
            Next
          </button>
        </div>
      </div>
    );
  } else if (stepIndex === 3) {
    // Step 4
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 4: Location Info</h2>
        <div className={styles.fieldGroup}>
          <label>City</label>
          <input
            className={styles.input}
            type="text"
            placeholder="City"
            value={release.release_location.city}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                release_location: {
                  ...prev.release_location,
                  city: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>State</label>
          <input
            className={styles.input}
            type="text"
            placeholder="State"
            value={release.release_location.state}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                release_location: {
                  ...prev.release_location,
                  state: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Country</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Country"
            value={release.release_location.country}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                release_location: {
                  ...prev.release_location,
                  country: e.target.value,
                },
              }))
            }
          />
        </div>

        <div className={styles.stepNav}>
          <button className={styles.button} onClick={prevStep}>
            Back
          </button>
          <button className={styles.button} onClick={nextStep}>
            Next
          </button>
        </div>
      </div>
    );
  } else {
    // Step 5
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 5: Review & Finish</h2>
        <p>
          <strong>Artist:</strong> {release.metadata.artist}
        </p>
        <p>
          <strong>Featured Artists:</strong>{" "}
          {release.metadata.featured_artists || "(none)"}
        </p>
        <p>
          <strong>Track Title:</strong> {release.metadata.track_title}
        </p>
        <p>
          <strong>Album Title:</strong> {release.metadata.album_title}
        </p>
        <p>
          <strong>Language:</strong> {release.metadata.language}
        </p>
        <p>
          <strong>ISRC:</strong> {release.metadata.isrc}
        </p>
        <p>
          <strong>BPM:</strong> {release.metadata.bpm}
        </p>
        <p>
          <strong>Spotify DSP:</strong> {release.dsp_links.spotify}
        </p>
        <p>
          <strong>Apple Music DSP:</strong> {release.dsp_links.apple_music_url}
        </p>
        <p>
          <strong>City:</strong> {release.release_location.city}
        </p>
        {release.audio_url && (
          <p>
            <strong>Audio URL:</strong> {release.audio_url}
          </p>
        )}
        {release.image_url && (
          <p>
            <strong>Cover Art URL:</strong> {release.image_url}
          </p>
        )}

        <div className={styles.stepNav}>
          <button className={styles.button} onClick={prevStep}>
            Back
          </button>
          <button
            className={`${styles.button} ${styles.finishBtn}`}
            onClick={handleFinish}
          >
            Finish
          </button>
        </div>
      </div>
    );
  }

  // ========== RENDER UI ==========
  return (
    <div className={styles.root}>
      <div className={styles.main}>
        {/* Search Card */}
        <div className={styles.formCard}>
          <h2 style={{ color: "#fff", marginBottom: "1rem" }}>
            Search for a Track
          </h2>

          <div className={styles.fieldGroup}>
            <label style={{ color: "#fff" }}>
              Enter a search term (artist, track):
            </label>
            <input
              className={styles.input}
              type="text"
              value={searchQuery}
              placeholder="e.g. emangetalife"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={styles.button}
              onClick={handleSearch}
              disabled={isSearching}
              style={{ marginTop: "0.5rem", width: "100px" }}
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>

          {/* Display dropdown */}
          {searchResults.length > 0 && (
            <div className={styles.fieldGroup}>
              <label style={{ color: "#fff" }}>Select a track:</label>
              <select
                className={styles.select}
                onChange={(e) => {
                  const idx = e.target.value;
                  if (idx !== "none") {
                    handleSelectTrack(searchResults[idx]);
                  } else {
                    setSelectedTrack(null);
                  }
                }}
              >
                <option value="none">-- Choose a track --</option>
                {searchResults.map((track, idx) => (
                  <option key={idx} value={idx}>
                    {track.heading?.title} by {track.heading?.subtitle}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If a track is selected, show the SMALL horizontal preview */}
          {selectedTrack && (
            <div className={styles.previewRow}>
              {/* Cover Art */}
              <img
                className={styles.albumArt}
                src={selectedTrack.coverUrl}
                alt="cover"
              />

              {/* Middle text: track + artist */}
              <div className={styles.previewText}>
                <div className={styles.previewTitle}>{selectedTrack.title}</div>
                <div className={styles.previewArtist}>
                  {selectedTrack.artist}
                </div>
              </div>

              {/* Audio controls */}
              {selectedTrack.audioUrl ? (
                <audio
                  controls
                  src={selectedTrack.audioUrl}
                  className={styles.audioPlayer}
                >
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <div style={{ color: "#ccc" }}>No audio</div>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <span>
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* The multi-step form card */}
        <div className={styles.formCard}>
          <div className={styles.stepWrapper}>
            <LeftColumn
              artist={artist}
              setArtist={setArtist}
              featuredArtists={featuredArtists}
              setFeaturedArtists={setFeaturedArtists}
              writingCredits={writingCredits}
              setWritingCredits={setWritingCredits}
              producingCredits={producingCredits}
              setProducingCredits={setProducingCredits}
              masterFile={masterFile}
              setMasterFile={setMasterFile}
              coverArtFile={coverArtFile}
              setCoverArtFile={setCoverArtFile}
            />

            {RightSideContent}
          </div>
        </div>
      </div>
    </div>
  );
}
