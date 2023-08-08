import React from 'react'
import ReactDOM from 'react-dom/client'
import GraphColoring from './graph-coloring'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {createTheme, ThemeProvider} from "@mui/material";
import {materialTheme} from "./utils/const";


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider theme={materialTheme}>
            <GraphColoring/>
        </ThemeProvider>
    </React.StrictMode>,
)
