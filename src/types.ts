import { type Config } from 'tailwindcss';
import { type State } from 'tailwindcss-language-service';

export interface JitState extends State {
  config: Config;
}
