import { type State } from '@tailwindcss/language-service'
import { type Config } from 'tailwindcss'

export interface JitState extends State {
  config: Config
}
