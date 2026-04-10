/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                navy: {
                    50: '#EAF0F7',
                    100: '#C8D5E5',
                    200: '#A3B7D1',
                    300: '#7E99BD',
                    400: '#5A7BA8',
                    500: '#2D4F73',
                    600: '#1A2B4C',
                    700: '#152340',
                    800: '#101B33',
                    900: '#0B1326',
                    950: '#060A19',
                },
                brand: {
                    50: '#E6FAFA',
                    100: '#B3F0F0',
                    200: '#80E6E6',
                    300: '#4DDBDB',
                    400: '#1AD1D1',
                    500: '#00D2D3',
                    600: '#00B8B9',
                    700: '#009E9F',
                    800: '#007A7B',
                    900: '#005758',
                    950: '#003A3B',
                },
                coral: {
                    50: '#FFF0F0',
                    100: '#FFD6D6',
                    200: '#FFB8B8',
                    300: '#FF9999',
                    400: '#FF6B6B',
                    500: '#FF4D4D',
                    600: '#E63939',
                    700: '#CC2929',
                    800: '#991F1F',
                    900: '#661414',
                    950: '#330A0A',
                },
            },
        },
    },
    plugins: [],
}
