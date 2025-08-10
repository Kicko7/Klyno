import { createStyles } from 'antd-style';

export const useTypingIndicatorStyles = createStyles(({ css, token }) => ({
  indicator: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 0 4px;

    span {
      width: 4px;
      height: 4px;
      background-color: ${token.colorTextSecondary};
      border-radius: 50%;
      animation: typing 1s infinite;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }

    @keyframes typing {
      0%,
      60%,
      100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-4px);
      }
    }
  `,
}));
