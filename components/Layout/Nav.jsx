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
            url={user.profilePicture || '/default-avatar.png'}
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
            <button onClick={onDisconnect} className={styles.menuItem}>
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

  // 1) Pull info from Privy
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    getAccessToken, // we'll use this to fetch the Privy token for our server login
  } = usePrivy();

  // 2) Local DB user doc
  const [localUser, setLocalUser] = useState(null);

  // 3) For mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  // 4) Track if we've already done the server-side login
  const [serverLoggedIn, setServerLoggedIn] = useState(false);

  // 5) If Privy is connected, fetch local user doc
  useEffect(() => {
    // If not ready or not authenticated => clear local user
    if (!ready || !authenticated || !privyUser?.id) {
      setLocalUser(null);
      setServerLoggedIn(false); // reset because user might have changed
      return;
    }

    // Avoid infinite loop if we're on the sign-up page
    if (router.pathname === '/sign-up') {
      return;
    }

    fetcher(`/api/user?uid=${encodeURIComponent(privyUser.id)}`)
      .then((res) => {
        // If no user => redirect to sign-up
        if (!res.user) {
          router.push('/sign-up');
          return;
        }
        // If user but no username => also sign-up
        if (!res.user.username) {
          router.push('/sign-up');
          return;
        }
        // Otherwise we have a valid local user
        setLocalUser(res.user);
      })
      .catch((err) => {
        console.error('Error fetching local user doc:', err);
        // e.g. 401 => sign-up
        router.push('/sign-up');
      });
  }, [ready, authenticated, privyUser?.id, router]);

  // 6) Once we have a valid localUser with username, do server-based login if not done yet
  useEffect(() => {
    const doServerSideLogin = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn('No Privy token found, cannot server-login');
          return;
        }
        // Call your /api/auth/privy endpoint, passing the token in Bearer
        await fetch('/api/privy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setServerLoggedIn(true);
      } catch (err) {
        console.error('Server login via /api/auth/privy failed:', err);
      }
    };

    // If localUser has a username and we haven't done the server login yet, do it
    if (localUser?.username && !serverLoggedIn) {
      doServerSideLogin();
    }
  }, [localUser?.username, serverLoggedIn, getAccessToken]);

  // 7) Disconnect from Privy
  const handleDisconnect = useCallback(async () => {
    try {
      await logout(); // clear Privy session on the client
      setLocalUser(null);
      setServerLoggedIn(false);
      toast.success('Disconnected');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Error disconnecting');
    }
  }, [logout, router]);

  // 8) If not ready or user is already connected, we adjust connect button state
  const disableConnect = !ready || (ready && authenticated);

  return (
    <nav className={styles.nav}>
      <Wrapper className={styles.wrapper}>
        <Container
          className={styles.content}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* LEFT SECTION: Logo, maybe user avatar if you like */}
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

          {/* MIDDLE SECTION: Nav links + search */}
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

          {/* RIGHT SECTION: If connected => user menu or "Disconnect", else "Connect / Sign Up" */}
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
