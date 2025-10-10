import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        'border-hover': 'hsl(var(--border-hover))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          light: 'hsl(var(--primary-light))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          hover: 'hsl(var(--secondary-hover))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          light: 'hsl(var(--destructive-light))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
          hover: 'hsl(var(--muted-hover))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          light: 'hsl(var(--accent-light))',
          hover: 'hsl(var(--accent-hover))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          hover: 'hsl(var(--card-hover))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          light: 'hsl(var(--success-light))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          light: 'hsl(var(--warning-light))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        // PALETA NUVIA - Colores principales del sistema
        nuvia: {
          // Deep Purple - Sofisticado y elegante
          deep: {
            DEFAULT: 'hsl(var(--nuvia-deep))', // #5A405D
            hover: 'hsl(var(--nuvia-deep-hover))',
            light: 'hsl(var(--nuvia-deep-light))',
            dark: 'hsl(var(--nuvia-deep-dark))',
            50: 'hsl(var(--nuvia-deep-light))',
            500: 'hsl(var(--nuvia-deep))',
            600: 'hsl(var(--nuvia-deep-hover))',
            900: 'hsl(var(--nuvia-deep-dark))'
          },
          // Mauve Rose - Equilibrado y refinado
          mauve: {
            DEFAULT: 'hsl(var(--nuvia-mauve))', // #865E76
            hover: 'hsl(var(--nuvia-mauve-hover))',
            light: 'hsl(var(--nuvia-mauve-light))',
            dark: 'hsl(var(--nuvia-mauve-dark))',
            50: 'hsl(var(--nuvia-mauve-light))',
            500: 'hsl(var(--nuvia-mauve))',
            600: 'hsl(var(--nuvia-mauve-hover))',
            900: 'hsl(var(--nuvia-mauve-dark))'
          },
          // Warm Rose - Acogedor y moderno
          rose: {
            DEFAULT: 'hsl(var(--nuvia-rose))', // #B27F84
            hover: 'hsl(var(--nuvia-rose-hover))',
            light: 'hsl(var(--nuvia-rose-light))',
            dark: 'hsl(var(--nuvia-rose-dark))',
            50: 'hsl(var(--nuvia-rose-light))',
            500: 'hsl(var(--nuvia-rose))',
            600: 'hsl(var(--nuvia-rose-hover))',
            900: 'hsl(var(--nuvia-rose-dark))'
          },
          // Soft Peach - Amigable y cercano
          peach: {
            DEFAULT: 'hsl(var(--nuvia-peach))', // #E79E98
            hover: 'hsl(var(--nuvia-peach-hover))',
            light: 'hsl(var(--nuvia-peach-light))',
            dark: 'hsl(var(--nuvia-peach-dark))',
            50: 'hsl(var(--nuvia-peach-light))',
            500: 'hsl(var(--nuvia-peach))',
            600: 'hsl(var(--nuvia-peach-hover))',
            900: 'hsl(var(--nuvia-peach-dark))'
          },
          // Warm Beige - Neutral y versátil
          beige: {
            DEFAULT: 'hsl(var(--nuvia-beige))', // #A18FA2
            hover: 'hsl(var(--nuvia-beige-hover))',
            light: 'hsl(var(--nuvia-beige-light))',
            dark: 'hsl(var(--nuvia-beige-dark))',
            50: 'hsl(var(--nuvia-beige-light))',
            500: 'hsl(var(--nuvia-beige))',
            600: 'hsl(var(--nuvia-beige-hover))',
            900: 'hsl(var(--nuvia-beige-dark))'
          },
          // Light Silver - Limpio y profesional
          silver: {
            DEFAULT: 'hsl(var(--nuvia-silver))', // #C2C2CC
            hover: 'hsl(var(--nuvia-silver-hover))',
            light: 'hsl(var(--nuvia-silver-light))',
            dark: 'hsl(var(--nuvia-silver-dark))',
            50: 'hsl(var(--nuvia-silver-light))',
            500: 'hsl(var(--nuvia-silver))',
            600: 'hsl(var(--nuvia-silver-hover))',
            900: 'hsl(var(--nuvia-silver-dark))'
          }
        }
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-metallic': 'var(--gradient-metallic)',
        'gradient-hero': 'var(--gradient-hero)',
        // Gradientes Nuvia
        'gradient-nuvia-sunset': 'var(--gradient-nuvia-sunset)',
        'gradient-nuvia-dawn': 'var(--gradient-nuvia-dawn)',
        'gradient-nuvia-twilight': 'var(--gradient-nuvia-twilight)',
        'gradient-nuvia-ethereal': 'var(--gradient-nuvia-ethereal)',
        'gradient-nuvia-royal': 'var(--gradient-nuvia-royal)',
        'gradient-nuvia-warm': 'var(--gradient-nuvia-warm)',
        'gradient-nuvia-radial-hero': 'var(--gradient-nuvia-radial-hero)',
        'gradient-nuvia-radial-glow': 'var(--gradient-nuvia-radial-glow)'
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
        'accent': 'var(--shadow-accent)',
        // Sombras Nuvia
        'nuvia-soft': 'var(--shadow-nuvia-soft)',
        'nuvia-medium': 'var(--shadow-nuvia-medium)',
        'nuvia-strong': 'var(--shadow-nuvia-strong)',
        'nuvia-glow': 'var(--shadow-nuvia-glow)',
        'nuvia-accent': 'var(--shadow-nuvia-accent)'
      },
      transitionProperty: {
        'smooth': 'all',
      },
      transitionDuration: {
        'fast': '150ms',
        'smooth': '250ms',
        'slow': '350ms'
      },
      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius-sm)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gradient-shift': 'gradient-shift 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;