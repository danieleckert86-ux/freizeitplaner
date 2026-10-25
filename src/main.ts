import {createLeisureDatabase} from './database';
import {initIdeaApp} from './idea-app';
import './idea-app.css';

initIdeaApp(document.querySelector<HTMLElement>('#app')!,createLeisureDatabase());
