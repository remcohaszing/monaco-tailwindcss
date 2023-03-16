import { Config } from 'tailwindcss';
import { State } from 'tailwindcss-language-service';

export interface JitState extends State {
  config: Config;
}
