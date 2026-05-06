import { useAccount, useBalance, useReadContract } from "wagmi";
import { ERC20_ABI, type TokenInfo } from "@/lib/web3/contracts";
import { formatUnits } from "viem";

export function useTokenBalance(token?: TokenInfo) {
  const { address } = useAccount();
  const native = useBalance({
    address,
    query: { enabled: !!address && !!token?.isNative },
  });
  const erc20 = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!token && !token.isNative },
  });

  if (!token || !address) return { value: 0n, formatted: "0", refetch: () => {} };
  if (token.isNative) {
    return {
      value: native.data?.value ?? 0n,
      formatted: native.data ? formatUnits(native.data.value, native.data.decimals) : "0",
      refetch: native.refetch,
    };
  }
  const v = (erc20.data as bigint | undefined) ?? 0n;
  return { value: v, formatted: formatUnits(v, token.decimals), refetch: erc20.refetch };
}
