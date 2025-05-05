import { useContext, useCallback } from 'react'
import { ethers } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { erc20Abi } from 'viem'
import AudioStakingAbi from '@/abis/AudioStaking/AudioStaking.json'
import AudioFiTokenAbi from '@/abis/AudioFiToken/AudioFiToken.json'
import { ClientContext, SignatureContext } from '@/contexts'
import { useEstimateUserOpFee } from '@/hooks'
import { useEthersSigner, useConfig, useTransaction } from '@/hooks'
import { OperationData } from '@/types'
import { PAYMASTER_MODE } from '@/types/Paymaster'
import { useBuilderWithPaymaster } from '@/utils'

export const useAAstake = () => {
    const signer = useEthersSigner()
    const client = useContext(ClientContext)
    const { simpleAccountInstance } = useContext(SignatureContext)!
    const { tokenPaymaster } = useConfig()
    const { estimateUserOpFee, ensurePaymasterApproval } = useEstimateUserOpFee()
    const { initBuilder } = useBuilderWithPaymaster(signer)

    const estimateStakeFee = useCallback(
        async (
            contentId: number,
            amount: string,
            stakingContractAddress: string,
            tokenAddress?: string,
            usePaymaster: boolean = false,
            paymasterTokenAddress?: string,
            type: number = 0,
        ) => {
            if (!signer || !client || !simpleAccountInstance) {
                return '0'
            }

            try {
                const operations: OperationData[] = []

                const tokenContract = new ethers.Contract(tokenAddress, AudioFiTokenAbi, signer)
                const decimals = await tokenContract.decimals()
                const parsedAmount = parseUnits(amount, decimals)
                // 1. Approve staking contract to spend tokens
                operations.push({
                    contractAddress: tokenAddress,
                    abi: erc20Abi,
                    function: 'approve',
                    params: [stakingContractAddress, parsedAmount],
                    value: ethers.constants.Zero,
                })
                // 2. Stake tokens
                // ✅ Add stake() operation
                operations.push({
                    contractAddress: stakingContractAddress,
                    abi: AudioStakingAbi,
                    function: 'stake',
                    params: [contentId, parsedAmount],
                    value: ethers.constants.Zero
                });
                // Optional paymaster token approval (if using paymaster)
                if (usePaymaster && paymasterTokenAddress && type !== PAYMASTER_MODE.FREE_GAS) {
                    await ensurePaymasterApproval(paymasterTokenAddress);
                }

                // ✅ Estimate the fee for all combined operations
                return estimateUserOpFee(operations, usePaymaster, paymasterTokenAddress, type);

            } catch (error) {
                return '0.0001'
            }
        },
        [signer, client, simpleAccountInstance, estimateUserOpFee, ensurePaymasterApproval],
    )

    const stakeFn = useCallback(
        async (
            contentId: number,
            amount: string,
            stakingContractAddress: string,
            tokenAddress?: string,
            usePaymaster: boolean = false,
            paymasterTokenAddress?: string,
            type: number = 0,
        ) => {
            if (!signer || !client || !simpleAccountInstance || !initBuilder) {
                throw new Error('Required dependencies not available')
            }

            let decimals = 18

            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

            try {
                decimals = await tokenContract.decimals();
            } catch { }

            const builder = await initBuilder(usePaymaster, paymasterTokenAddress, type)
            if (!builder) {
                throw new Error('Failed to initialize builder')
            }

            const parsedAmount = parseUnits(amount, decimals);

            const paymasterTokenInterface = new ethers.Contract(
                paymasterTokenAddress,
                erc20Abi,
                signer,
            )

            const currentAllowance = await paymasterTokenInterface.allowance(
                await signer.getAddress(),
                tokenPaymaster,
            )


            if (currentAllowance.isZero()) {
                const approvePaymasterCall = {
                    to: paymasterTokenAddress,
                    value: ethers.constants.Zero,
                    data: paymasterTokenInterface.interface.encodeFunctionData('approve', [
                        tokenPaymaster,
                        ethers.constants.MaxUint256,
                    ]),
                }
                const approveOp = await builder.execute(
                    approvePaymasterCall.to,
                    approvePaymasterCall.value,
                    approvePaymasterCall.data,
                )
                const approveRes = await client.sendUserOperation(approveOp)
                await approveRes.wait()
            }
            // // ✅ Approve staking contract to spend tokens
            // const approveData = tokenContract.interface.encodeFunctionData('approve', [
            //     stakingContractAddress,
            //     parsedAmount,
            // ])
            // const approveOp = await builder.execute(
            //     tokenAddress,
            //     ethers.constants.Zero,
            //     approveData
            // );
            // const approveRes = await client.sendUserOperation(approveOp);
            // await approveRes.wait();

            // const receipt = await simpleAccountInstance.checkUserOp(approveRes.userOpHash);
            // // ✅ Build and send stake operation
            // const audioStakingInterface = new ethers.utils.Interface([
            //     'function stake(uint256 contentId, uint256 amount) external'
            // ]);
            // const stakeData = audioStakingInterface.encodeFunctionData('stake', [
            //     contentId,
            //     parsedAmount
            // ]);

            // const stakeOp = await builder.execute(
            //     stakingContractAddress,
            //     ethers.constants.Zero,
            //     stakeData
            // );
            // const res = await client.sendUserOperation(stakeOp);
            // await res.wait();

            // const receipt = await simpleAccountInstance.checkUserOp(res.userOpHash);


            let userOp;
            const erc20Interface = new ethers.Contract(tokenAddress, erc20Abi, signer)

            const transferCall = {
                to: tokenAddress,
                value: ethers.constants.Zero,
                data: erc20Interface.interface.encodeFunctionData('transfer', [
                    stakingContractAddress,
                    parsedAmount,
                ]),
            }

            userOp = await builder.execute(transferCall.to, transferCall.value, transferCall.data)

            const res = await client.sendUserOperation(userOp)
            await res.wait()

            const userOpResult = await simpleAccountInstance.checkUserOp(res.userOpHash)

            return { hash: res.userOpHash, receipt: userOpResult }
        },
        [signer, client, simpleAccountInstance, initBuilder, tokenPaymaster],
    )

    const {
        isLoading,
        isError,
        error,
        isSuccess,
        execute: transfer,
        reset,
    } = useTransaction(stakeFn)

    return {
        transfer,
        estimateStakeFee,
        isLoading,
        isSuccess,
        isError,
        error,
        reset,
    }
}
