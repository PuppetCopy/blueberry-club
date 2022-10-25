/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

export interface IPositionRouterInterface extends utils.Interface {
  functions: {
    "decreasePositionRequestKeysStart()": FunctionFragment;
    "executeDecreasePositions(uint256,address)": FunctionFragment;
    "executeIncreasePositions(uint256,address)": FunctionFragment;
    "increasePositionRequestKeysStart()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "decreasePositionRequestKeysStart"
      | "executeDecreasePositions"
      | "executeIncreasePositions"
      | "increasePositionRequestKeysStart"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "decreasePositionRequestKeysStart",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "executeDecreasePositions",
    values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "executeIncreasePositions",
    values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "increasePositionRequestKeysStart",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "decreasePositionRequestKeysStart",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executeDecreasePositions",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executeIncreasePositions",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increasePositionRequestKeysStart",
    data: BytesLike
  ): Result;

  events: {};
}

export interface IPositionRouter extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IPositionRouterInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    decreasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    executeDecreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    executeIncreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    increasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  decreasePositionRequestKeysStart(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  executeDecreasePositions(
    _count: PromiseOrValue<BigNumberish>,
    _executionFeeReceiver: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  executeIncreasePositions(
    _count: PromiseOrValue<BigNumberish>,
    _executionFeeReceiver: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  increasePositionRequestKeysStart(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    decreasePositionRequestKeysStart(
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    executeDecreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    executeIncreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    increasePositionRequestKeysStart(
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {};

  estimateGas: {
    decreasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    executeDecreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    executeIncreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    increasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    decreasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    executeDecreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    executeIncreasePositions(
      _count: PromiseOrValue<BigNumberish>,
      _executionFeeReceiver: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    increasePositionRequestKeysStart(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}