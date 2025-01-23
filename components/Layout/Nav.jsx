import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';

// 1) Import react-icons
import {
  FaUser,
  FaCog,
  FaUpload,
  FaSignOutAlt,
  FaAdjust,
} from 'react-icons/fa';

import { fetcher } from '@/lib/fetch';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import Spacer from './Spacer';
import Container from './Container';
import Wrapper from './Wrapper';

import styles from './Nav.module.css';

// A small sub-component for the user dropdown
const UserMenu = ({ user, onDisconnect }) => {
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

  // Detect outside click to close menu
  useEffect(() => {
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
            url={user.profileImage || '/default-avatar.png'}
            username={user.username || 'NoUsername'}
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
          {/* MENU CONTENT */}
          <div className={styles.menu}>
            {/* Top row: Profile + Settings side by side */}
            <div className={styles.menuTopRow}>
              <Link legacyBehavior passHref href={`/user/${user.username}`}>
                <a className={styles.menuItem}>
                  <FaUser className={styles.menuIcon} />
                  Profile
                </a>
              </Link>
              <Link legacyBehavior passHref href="/settings">
                <a className={styles.menuItem}>
                  <FaCog className={styles.menuIcon} />
                  Settings
                </a>
              </Link>
            </div>

            {/* Big Upload button */}
            <Link legacyBehavior passHref href={`/new-release`}>
              <a className={`${styles.menuItem} ${styles.uploadBtn}`}>
                <FaUpload className={styles.menuIcon} />
                Upload Music
              </a>
            </Link>

            {/* Theme switch row */}
            <div className={`${styles.menuItem} ${styles.themeRow}`}>
              <FaAdjust className={styles.menuIcon} />
              <span>Theme</span>
              <Spacer size={0.5} axis="horizontal" />
              <ThemeSwitcher />
            </div>

            {/* Disconnect button */}
            <button onClick={onDisconnect} className={styles.menuItem}>
              <FaSignOutAlt className={styles.menuIcon} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Nav = () => {
  const router = useRouter();

  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    getAccessToken,
  } = usePrivy();

  const [localUser, setLocalUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverLoggedIn, setServerLoggedIn] = useState(false);

  // Fetch local user doc from your DB once Privy is ready
  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id) {
      setLocalUser(null);
      setServerLoggedIn(false);
      return;
    }
    if (router.pathname === '/sign-up') {
      return;
    }
    fetcher(`/api/user?uid=${encodeURIComponent(privyUser.id)}`)
      .then((res) => {
        if (!res.user) {
          router.push('/sign-up');
          return;
        }
        if (!res.user.username) {
          router.push('/sign-up');
          return;
        }
        setLocalUser(res.user);
      })
      .catch((err) => {
        console.error('Error fetching local user doc:', err);
        router.push('/sign-up');
      });
  }, [ready, authenticated, privyUser?.id, router]);

  // Once we have a valid localUser, do server-based login if not done
  useEffect(() => {
    const doServerSideLogin = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn('No Privy token found, cannot server-login');
          return;
        }
        await fetch('/api/privy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setServerLoggedIn(true);
      } catch (err) {
        console.error('Server login via /api/privy failed:', err);
      }
    };
    if (localUser?.username && !serverLoggedIn) {
      doServerSideLogin();
    }
  }, [localUser?.username, serverLoggedIn, getAccessToken]);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await logout();
      setLocalUser(null);
      setServerLoggedIn(false);
      toast.success('Disconnected');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Error disconnecting');
    }
  }, [logout, router]);

  const disableConnect = !ready || (ready && authenticated);

  return (
    <nav className={styles.nav}>
      <Wrapper className={styles.wrapper}>
        <Container
          className={styles.content}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* LEFT SECTION */}
          <Container alignItems="center" className={styles.leftSection}>
            <Link legacyBehavior href="/">
              <span className={styles.logoText}>
                limelight <span className={styles.beta}>beta</span>
              </span>
            </Link>

            {authenticated && localUser?.username && (
              <div className={styles.leftUserDisplay}>
                <Avatar
                  size={32}
                  url={localUser.profilePicture || '/default-avatar.png'}
                  username={localUser.username}
                />
                <span className={styles.userNameLeft}>
                  {localUser.username}
                </span>
              </div>
            )}

            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
          </Container>

          {/* MIDDLE SECTION */}
          <div
            className={`${styles.navCenter} ${
              mobileOpen ? styles.navCenterOpen : ''
            }`}
          >
            <div className={styles.navLinks}>
              <Link legacyBehavior href="/feed">
                <a className={styles.navLink}>Feed</a>
              </Link>
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

          {/* RIGHT SECTION */}
          <div className={styles.rightSection}>
            {authenticated ? (
              localUser?.username ? (
                <UserMenu user={localUser} onDisconnect={handleDisconnect} />
              ) : (
                <Button size="small" onClick={handleDisconnect} type="error">
                  Disconnect
                </Button>
              )
            ) : (
              <div className={styles.authButtons}>
                <button
                  disabled={disableConnect}
                  onClick={login}
                  className={styles.loginBtn}
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </Container>
      </Wrapper>
    </nav>
  );
};

export default Nav;
