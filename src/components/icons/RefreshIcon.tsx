import type { IconProps } from './IconProps';

const RefreshIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M20 11a8.1 8.1 0 1 0 .1 3M20 4v7h-7"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    />
  </svg>
);

export default RefreshIcon;
