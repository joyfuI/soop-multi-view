import type { IconProps } from './IconProps';

const MenuIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M5 7.5h14M5 12h14M5 16.5h14"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.8"
    />
  </svg>
);

export default MenuIcon;
