import { useRef, useState, useEffect } from 'react';
import firebase from '@/lib/firebaseClient';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Wrapper, Spacer } from '@/components/Layout';
import styles from './Auth.module.css';

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        router.replace('/feed');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await firebase
        .auth()
        .signInWithEmailAndPassword(
          emailRef.current.value,
          passwordRef.current.value
        );
      toast.success('You have been logged in.');
      router.push('/feed');
    } catch (error) {
      console.error(error);
      toast.error('Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Wrapper className={styles.root}>
      <div className={styles.main}>
        <h1 className={styles.title}>Login to App</h1>
        <form onSubmit={onSubmit}>
          <Input
            ref={emailRef}
            htmlType="email"
            autoComplete="email"
            placeholder="Email Address"
            ariaLabel="Email Address"
            size="large"
            required
          />
          <Spacer size={0.5} axis="vertical" />
          <Input
            ref={passwordRef}
            htmlType="password"
            autoComplete="current-password"
            placeholder="Password"
            ariaLabel="Password"
            size="large"
            required
          />
          <Spacer size={0.5} axis="vertical" />
          <Button
            htmlType="submit"
            className={styles.submit}
            type="success"
            size="large"
            loading={isLoading}
          >
            Log in
          </Button>
        </form>
      </div>
      <div className={styles.footer}>
        {/* You can add additional links (e.g. "Forget Password") here */}
      </div>
    </Wrapper>
  );
};

export default Login;
