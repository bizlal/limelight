// Nav.js
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';

import { fetcher } from '@/lib/fetch';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import Spacer from './Spacer';
import Container from './Container';
import Wrapper from './Wrapper';

import styles from './Nav.module.css';

// A small sub-component for the user dropdown
const UserMenu = ({ user, onLogout }) => {
  const menuRef = useRef(null);
  const avatarRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const onRouteChangeComplete = () => setVisible(false);
    router.events.on('routeChangeComplete', onRouteChangeComplete);
    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete);
    };
  }, [router.events]);

  useEffect(() => {
    // detect outside click to close menu
    const onMouseDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return (
    <div className={styles.userMenu}>
      <button
        className={styles.trigger}
        ref={avatarRef}
        onClick={() => setVisible(!visible)}
      >
        <div className={styles.avatarContainer}>
          <Avatar
            size={32}
            username={user.username}
            url={user.profilePicture}
          />
          <span className={styles.userName}>{user.username}</span>
        </div>
      </button>
      {visible && (
        <div
          ref={menuRef}
          role="menu"
          aria-hidden={!visible}
          className={styles.popover}
        >
          <div className={styles.menu}>
            <Link legacyBehavior passHref href={`/user/${user.username}`}>
              <a className={styles.menuItem}>Profile</a>
            </Link>
            <Link legacyBehavior passHref href="/settings">
              <a className={styles.menuItem}>Settings</a>
            </Link>
            <div className={styles.menuItem} style={{ cursor: 'auto' }}>
              <Container alignItems="center">
                <span>Theme</span>
                <Spacer size={0.5} axis="horizontal" />
                <ThemeSwitcher />
              </Container>
            </div>
            <button onClick={onLogout} className={styles.menuItem}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Nav = () => {
  const router = useRouter();

  // 1) Pull info from Privy
  const { ready, authenticated, user: privyUser, login, logout } = usePrivy();
  const [localUser, setLocalUser] = useState(null); // your DB user doc
  const [mobileOpen, setMobileOpen] = useState(false);

  // 2) If user is authenticated with Privy, fetch your local user doc by privyId
  useEffect(() => {
    if (!ready) return; // wait until Privy is ready
    if (!authenticated || !privyUser?.id) {
      // Not logged in, or no ID yet
      setLocalUser(null);
      return;
    }

    // Example: /api/user?privyId=<did:privy:XXXX>
    // Your backend route should verify the token or trust
    // the client for this simple read.
    fetcher(`/api/user?privyId=${encodeURIComponent(privyUser.id)}`)
      .then((res) => {
        // e.g. { user: { username, profilePicture, ... } }
        setLocalUser(res.user || null);
      })
      .catch((err) => {
        console.error('Error fetching local user doc:', err);
        setLocalUser(null);
      });
  }, [ready, authenticated, privyUser?.id]);

  // 3) Sign out -> call Privy logout
  const handleSignOut = useCallback(async () => {
    try {
      await logout(); // end Privy session
      setLocalUser(null);
      toast.success('Signed out');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Error signing out');
    }
  }, [logout, router]);

  // If Privy isn't ready or user is already authenticated, we adjust login button state
  const disableLogin = !ready || (ready && authenticated);

  return (
    <nav className={styles.nav}>
      <Wrapper className={styles.wrapper}>
        <Container
          className={styles.content}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Logo */}
          <Container alignItems="center" className={styles.leftSection}>
            <Link legacyBehavior href="/">
              <span className={styles.logoText}>
                limelight <span className={styles.beta}>beta</span>
              </span>
            </Link>
            {/* Hamburger for mobile */}
            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
          </Container>

          {/* Middle Nav: Nav links + Search */}
          <div
            className={`${styles.navCenter} ${
              mobileOpen ? styles.navCenterOpen : ''
            }`}
          >
            <div className={styles.navLinks}>
              <Link legacyBehavior href="/discover">
                <a className={styles.navLink}>Discover</a>
              </Link>
              <Link legacyBehavior href="/library">
                <a className={styles.navLink}>Library</a>
              </Link>
              <Link legacyBehavior href="/top-charts">
                <a className={styles.navLink}>Top Charts</a>
              </Link>
              <Link legacyBehavior href="/playlist">
                <a className={styles.navLink}>Playlist</a>
              </Link>
            </div>
            <div className={styles.searchContainer}>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search..."
              />
            </div>
          </div>

          {/* Right section: show user menu if we have localUser, else login/signup */}
          <div className={styles.rightSection}>
            {localUser ? (
              <UserMenu user={localUser} onLogout={handleSignOut} />
            ) : (
              <div className={styles.authButtons}>
                <button
                  disabled={disableLogin}
                  onClick={login}
                  className={styles.loginBtn}
                >
                  Log in
                </button>
                <Spacer axis="horizontal" size={0.5} />
                <Link legacyBehavior passHref href="/sign-up">
                  <Button size="small" type="success">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Container>
      </Wrapper>
    </nav>
  );
};

export default Nav;
