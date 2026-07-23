import type { IconProps } from './IconProps';

const MaximizeIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    />
  </svg>
);

export default MaximizeIcon;
