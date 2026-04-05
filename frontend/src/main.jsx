import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import { API_BASE_URL } from './config/api'

const LOCAL_GATEWAY_URLS = ['http://localhost:3000', 'http://127.0.0.1:3000']

axios.interceptors.request.use((config) => {
    if (typeof config.url !== 'string') {
        return config
    }

    const localGateway = LOCAL_GATEWAY_URLS.find((base) => config.url.startsWith(base))
    if (!localGateway) {
        return config
    }

    config.url = `${API_BASE_URL}${config.url.slice(localGateway.length)}`
    return config
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
