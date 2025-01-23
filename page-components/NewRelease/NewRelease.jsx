import React, { useEffect, useState } from 'react';
import { FaSpotify, FaApple, FaYoutube } from 'react-icons/fa';
import styles from './NewRelease.module.css';

// Placeholder: Upload file to Firebase, returns a URL
async function uploadFileToFirebase(file) {
  // Implement your real logic here
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('https://firebase.storage.com/mybucket/' + file.name);
    }, 1200);
  });
}

// Placeholder: Insert release into your Mongo DB
async function insertReleaseToDB(releaseData) {
  return fetch('/api/insertRelease', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
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
    if (f && (f.type.startsWith('audio/') || f.type.startsWith('video/'))) {
      setMasterFile(f);
    }
  };
  const removeMaster = () => setMasterFile(null);

  const handleCoverArtChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) {
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

  // Basic release schema
  const [release, setRelease] = useState({
    metadata: {
      track_title: '',
      album_title: '',
      language: '',
      release_type: 'single',
      isrc: '',
      bpm: 0,
      artist: '', // note we also store artist in left column
      featured_artists: '',
      writing_credits: '',
      producing_credits: '',
    },
    is_instrumental: false,
    is_explicit: false,
    dsp_links: {
      spotify: '',
      apple_music_url: '',
    },
    release_location: {
      city: '',
      state: '',
      country: '',
    },
    is_active: true,
    // other fields from your schema ...
  });

  // Files
  const [masterFile, setMasterFile] = useState(null);
  const [coverArtFile, setCoverArtFile] = useState(null);

  // For the left column "artist" fields
  // We keep them in local state for simplicity, then copy to release
  const [artist, setArtist] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState('');
  const [writingCredits, setWritingCredits] = useState('');
  const [producingCredits, setProducingCredits] = useState('');

  const totalSteps = 5;
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;

  const nextStep = () =>
    setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  const prevStep = () => setStepIndex((prev) => Math.max(0, prev - 1));

  // On finishing, do the uploads + DB insert
  const handleFinish = async () => {
    try {
      // 1) Copy left column fields into release
      const updatedRelease = {
        ...release,
        metadata: {
          ...release.metadata,
          artist,
          featured_artists: featuredArtists,
          writing_credits: writingCredits,
          producing_credits: producingCredits,
        },
      };

      // 2) Upload files
      let audioUrl = '';
      if (masterFile) {
        audioUrl = await uploadFileToFirebase(masterFile);
      }
      let coverArtUrl = '';
      if (coverArtFile) {
        coverArtUrl = await uploadFileToFirebase(coverArtFile);
      }

      // 3) Save final URLs in release
      updatedRelease.audio_url = audioUrl;
      updatedRelease.image_url = coverArtUrl;

      // 4) Insert into DB
      const result = await insertReleaseToDB(updatedRelease);
      console.log('DB Insert result:', result);

      setDone(true);
    } catch (err) {
      console.error('Error finishing release:', err);
      alert('Something went wrong, see console.');
    }
  };

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

  // Right column steps
  let RightSideContent = null;
  if (stepIndex === 0) {
    // Step 1: Basic Info on the right
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
          <button className={styles.button} onClick={() => nextStep()}>
            Next
          </button>
        </div>
      </div>
    );
  } else if (stepIndex === 1) {
    // Step 2: ISRC, BPM, etc
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
                metadata: {
                  ...prev.metadata,
                  isrc: e.target.value,
                },
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
            value={release.metadata.bpm || ''}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                metadata: {
                  ...prev.metadata,
                  bpm: Number(e.target.value),
                },
              }))
            }
          />
        </div>
        {/* Add more fields like secondary_genre, etc. as needed */}

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
    // Step 3: Release date, DSP links, is_active
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
                metadata: {
                  ...prev.metadata,
                  release_date: timeVal,
                },
              }));
            }}
          />
        </div>
        <div className={styles.checkGroup}>
          <input
            type="checkbox"
            checked={release.is_active}
            onChange={(e) =>
              setRelease((prev) => ({
                ...prev,
                is_active: e.target.checked,
              }))
            }
          />
          <label>Is Active?</label>
        </div>
        <div className={styles.fieldGroup}>
          <label>
            <FaSpotify style={{ marginRight: '6px' }} />
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
                dsp_links: {
                  ...prev.dsp_links,
                  spotify: e.target.value,
                },
              }))
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>
            <FaApple style={{ marginRight: '6px' }} />
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
    // Step 4: location, etc
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
    // Step 5: final review & finish
    RightSideContent = (
      <div className={styles.rightSide}>
        <h2 className={styles.stepHeading}>Step 5: Review & Finish</h2>
        <p>
          <strong>Artist:</strong> {release.metadata.artist}
        </p>
        <p>
          <strong>Featured Artists:</strong>{' '}
          {release.metadata.featured_artists || '(none)'}
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

  return (
    <div className={styles.root}>
      <div className={styles.main}>
        {/* Progress bar */}
        <div className={styles.progressBar}>
          <span>Step {stepIndex + 1} of 5</span>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${((stepIndex + 1) / 5) * 100}%` }}
            />
          </div>
        </div>

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

            {/* Step-based content in the right column */}
            {RightSideContent}
          </div>
        </div>
      </div>
    </div>
  );
}
