import type { IconProps } from './IconProps';

const MinimizeIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M4 14h6v6M20 10h-6V4"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    />
  </svg>
);

export default MinimizeIcon;
