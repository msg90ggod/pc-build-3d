import './style.css';
import { Game } from './core/Game.js';
import { sounds } from './audio/SoundEffects.js';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Web Audio on first user interaction
  const resumeAudio = () => {
    sounds.init();
    window.removeEventListener('click', resumeAudio);
    window.removeEventListener('keydown', resumeAudio);
  };
  window.addEventListener('click', resumeAudio);
  window.addEventListener('keydown', resumeAudio);

  // Initialize Simulator Game
  const game = new Game();
  window.pcBuilderGame = game;
});
