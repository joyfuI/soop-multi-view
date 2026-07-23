import type { IconProps } from './IconProps';

const PlusIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="2"
    />
  </svg>
);

export default PlusIcon;
