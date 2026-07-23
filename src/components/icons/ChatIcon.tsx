import type { IconProps } from './IconProps';

const ChatIcon = (props: IconProps) => (
  <svg aria-hidden="true" class={props.class} fill="none" viewBox="0 0 24 24">
    <path
      d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.8-.8L4 20l1.5-4A7.4 7.4 0 0 1 4 11.5C4 7.4 7.6 4 12 4s8 3.4 8 7.5Z"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    />
  </svg>
);

export default ChatIcon;
