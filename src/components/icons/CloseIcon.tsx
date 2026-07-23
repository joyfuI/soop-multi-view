import type { IconProps } from './IconProps';

const CloseIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="m7 7 10 10M17 7 7 17"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.8"
    />
  </svg>
);

export default CloseIcon;
