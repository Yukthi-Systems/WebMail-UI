/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { useLogin } from '../../hooks/useLogin';
import { Spinner } from '@radix-ui/themes';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import background from '../../assets/sign-in.svg';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '../../hooks/useToast';
import { useState, useEffect, useRef } from 'react';
import { userDetailsAtom } from '../../state/userDetails';
import { useAtom } from 'jotai';
import { MdEmail, MdMailOutline } from 'react-icons/md';
import {
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaFileAlt,
  FaTable,
  FaHdd,
  FaSync,
  FaLock,
} from 'react-icons/fa';
import { API_CONFIG } from '../../constants/config';
import ReCAPTCHA from 'react-google-recaptcha';
import { csrfTokenAtom } from '../../state/auth';

export interface LoginBranding {
  logoUrl: string | null;
  bgUrl: string | null;
  companyName?: string;
  /** If non-empty, only emails from these domains are accepted. */
  allowedDomains?: string[];
}

// Primary color configuration
const PRIMARY_COLOR = {
  50: 'rgb(255, 247, 237)', // bg-orange-50
  100: 'rgb(255, 237, 213)', // bg-orange-100
  600: 'rgb(234, 88, 12)', // text/bg-orange-600
  700: 'rgb(194, 65, 12)', // hover-orange-700
};

const RECAPTCHA_SITE_KEY = API_CONFIG.recaptch_key;

const schema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

type FormData = yup.InferType<typeof schema>;

interface CustomInputProps {
  name: string;
  label: string;
  type: string;
  placeholder: string;
}

const CustomInput: React.FC<CustomInputProps> = ({ name, label, type, placeholder }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const [showPassword, setShowPassword] = useState(false);
  const error = errors[name]?.message as string | undefined;

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type={inputType}
          placeholder={placeholder}
          {...register(name)}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all autofill:shadow-[inset_0_0_0_1000px_rgb(255,255,255)] autofill:[-webkit-text-fill-color:rgb(17,24,39)]"
          style={{
            borderColor: error ? 'rgb(239, 68, 68)' : undefined,
            paddingRight: isPassword ? '2.5rem' : undefined,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

const Login = ({ branding }: { branding?: LoginBranding }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [, setUserDetails] = useAtom(userDetailsAtom);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [csrfToken] = useAtom(csrfTokenAtom);
  const bgImageUrl = branding?.bgUrl ?? null;
  const logoImageUrl = branding?.logoUrl ?? null;
  const methods = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Reset reCAPTCHA on login error
  useEffect(() => {
    if (loginMutation.isError) {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    }
  }, [loginMutation.isError]);

  const onRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const onRecaptchaExpired = () => {
    setRecaptchaToken(null);
    toast.error({
      description: 'Security check expired. Please verify again.',
      duration: 3000,
    });
  };

  const onRecaptchaErrored = () => {
    setRecaptchaToken(null);
    toast.error({
      description: 'Security verification failed. Please try again.',
      duration: 3000,
    });
  };

  useEffect(() => {
    if (csrfToken) {
      navigate({ to: '/' });
    }
  }, [csrfToken, navigate]);

  const onSubmit = (data: FormData) => {
    if (!recaptchaToken) {
      toast.error({
        description: 'Please complete the security verification',
        duration: 3000,
      });
      return;
    }

    const domain = data.email.split('@')[1];

    if (branding?.allowedDomains && branding.allowedDomains.length > 0) {
      if (!branding.allowedDomains.includes(domain.toLowerCase())) {
        toast.error({
          description: `Only ${branding.allowedDomains.join(', ')} accounts can sign in here.`,
          duration: 4000,
        });
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        return;
      }
    }

    setIsLoading(true);

    loginMutation.mutate(
      {
        email: data.email,
        domain,
        password: data.password,
        recaptcha_token: recaptchaToken,
      },
      {
        onSuccess: () => {
          setUserDetails({ email: data.email, domain });
          recaptchaRef.current?.reset();
          setRecaptchaToken(null);
        },
        onError: (error) => {
          setIsLoading(false);

          // Reset reCAPTCHA on error
          recaptchaRef.current?.reset();
          setRecaptchaToken(null);

          toast.error({
            description: error.message || 'Failed to submit form. Please try again.',
            duration: 3000,
          });
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8"
      style={{
        backgroundImage: bgImageUrl ? `url("${bgImageUrl}")` : `url("${background}")`,
        backgroundSize: bgImageUrl ? '100% 100%' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#fafafa',
        transition: 'background-image 0.4s ease',
      }}
    >
      {/* Overlay for readability — lighter when custom bg is set */}
      <div className={`absolute inset-0 ${bgImageUrl ? 'bg-black/30' : 'bg-white/80'}`} />

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10">
          {/* Logo/Brand Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {logoImageUrl ? (
                <img
                  src={logoImageUrl}
                  alt="Domain logo"
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: PRIMARY_COLOR[50] }}
                >
                  <MdEmail className="w-8 h-8" style={{ color: PRIMARY_COLOR[600] }} />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-sm text-gray-600 text-center">
              {branding?.companyName
                ? `Sign in to ${branding.companyName}`
                : 'Sign in to continue to Webmail'}
            </p>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
              <CustomInput
                name="email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
              />

              <div className="space-y-1">
                <CustomInput
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                />
                {/* <div className="flex justify-end">
                  <a
                    href="https://prp.mailservice25.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Forgot password / Reset Password?
                  </a>
                </div> */}
              </div>

              {/* reCAPTCHA Component */}
              <div className="flex justify-center pt-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  size="normal"
                  theme="light"
                  onChange={onRecaptchaChange}
                  onExpired={onRecaptchaExpired}
                  onErrored={onRecaptchaErrored}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !recaptchaToken}
                className="w-full py-3 mt-6 px-4 text-center flex items-center justify-center text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                style={{
                  backgroundColor: isLoading || !recaptchaToken ? undefined : PRIMARY_COLOR[600],
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && recaptchaToken) {
                    e.currentTarget.style.backgroundColor = PRIMARY_COLOR[700];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && recaptchaToken) {
                    e.currentTarget.style.backgroundColor = PRIMARY_COLOR[600];
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="3" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </FormProvider>
        </div>

        {/* Separated Services Section */}
        <div
          className={`mt-6 px-4 ${bgImageUrl ? 'bg-white/70 backdrop-blur-sm rounded-xl py-3' : ''}`}
        >
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 mb-4">
            {[
              {
                href: 'https://prp.mailservice25.com/',
                icon: FaLock,
                label: 'Forgot password / Reset Password?',
              },
              { href: 'https://2fa.mail25.info/', icon: FaShieldAlt, label: '2FA Auth Page' },
              { href: 'https://docs.mail25.info/', icon: FaFileAlt, label: 'Shared Docs' },
              { href: 'https://sheets.mail25.info/', icon: FaTable, label: 'Shared Sheets' },
              { href: 'https://bfs.mail25.info/login.html', icon: FaHdd, label: 'File Storage' },
              { href: 'https://caldav.mail25.info/.web/', icon: FaSync, label: 'Calendar Sync' },
              {
                href: 'https://old.webmail.mail25.info',
                icon: MdMailOutline,
                label: 'Old - webmail.mail25.info',
              },
              { href: 'https://old.mail25.info', icon: MdMailOutline, label: 'Old - mail25.info' },
            ].map((service, index) => (
              <a
                key={index}
                href={service.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group transition-all duration-200"
              >
                <service.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                <span className="text-[11px] text-gray-500 group-hover:text-gray-900 font-medium whitespace-nowrap">
                  {service.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        {/* <div className="mt-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">© {new Date().getFullYear()} MAIL25 SYSTEMS</p>
        </div> */}
      </div>
      <p
        className={`absolute right-14 bottom-8 text-[11px] ${bgImageUrl ? 'text-white/80 drop-shadow' : 'text-gray-400'}`}
      >
        v{API_CONFIG.version}
      </p>
    </div>
  );
};

export default Login;
