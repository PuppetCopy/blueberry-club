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

export interface IShortsTrackerInterface extends utils.Interface {
  functions: {
    "getNextGlobalShortData(address,address,address,uint256,uint256,bool)": FunctionFragment;
    "globalShortAveragePrices(address)": FunctionFragment;
    "isGlobalShortDataReady()": FunctionFragment;
    "updateGlobalShortData(address,address,address,bool,uint256,uint256,bool)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "getNextGlobalShortData"
      | "globalShortAveragePrices"
      | "isGlobalShortDataReady"
      | "updateGlobalShortData"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "getNextGlobalShortData",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<boolean>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "globalShortAveragePrices",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "isGlobalShortDataReady",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "updateGlobalShortData",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<boolean>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<boolean>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "getNextGlobalShortData",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "globalShortAveragePrices",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isGlobalShortDataReady",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateGlobalShortData",
    data: BytesLike
  ): Result;

  events: {};
}

export interface IShortsTracker extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IShortsTrackerInterface;

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
    getNextGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _nextPrice: PromiseOrValue<BigNumberish>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    globalShortAveragePrices(
      _token: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    isGlobalShortDataReady(overrides?: CallOverrides): Promise<[boolean]>;

    updateGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _isLong: PromiseOrValue<boolean>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _markPrice: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  getNextGlobalShortData(
    _account: PromiseOrValue<string>,
    _collateralToken: PromiseOrValue<string>,
    _indexToken: PromiseOrValue<string>,
    _nextPrice: PromiseOrValue<BigNumberish>,
    _sizeDelta: PromiseOrValue<BigNumberish>,
    _isIncrease: PromiseOrValue<boolean>,
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber]>;

  globalShortAveragePrices(
    _token: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  isGlobalShortDataReady(overrides?: CallOverrides): Promise<boolean>;

  updateGlobalShortData(
    _account: PromiseOrValue<string>,
    _collateralToken: PromiseOrValue<string>,
    _indexToken: PromiseOrValue<string>,
    _isLong: PromiseOrValue<boolean>,
    _sizeDelta: PromiseOrValue<BigNumberish>,
    _markPrice: PromiseOrValue<BigNumberish>,
    _isIncrease: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    getNextGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _nextPrice: PromiseOrValue<BigNumberish>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    globalShortAveragePrices(
      _token: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isGlobalShortDataReady(overrides?: CallOverrides): Promise<boolean>;

    updateGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _isLong: PromiseOrValue<boolean>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _markPrice: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    getNextGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _nextPrice: PromiseOrValue<BigNumberish>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    globalShortAveragePrices(
      _token: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isGlobalShortDataReady(overrides?: CallOverrides): Promise<BigNumber>;

    updateGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _isLong: PromiseOrValue<boolean>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _markPrice: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getNextGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _nextPrice: PromiseOrValue<BigNumberish>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    globalShortAveragePrices(
      _token: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isGlobalShortDataReady(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    updateGlobalShortData(
      _account: PromiseOrValue<string>,
      _collateralToken: PromiseOrValue<string>,
      _indexToken: PromiseOrValue<string>,
      _isLong: PromiseOrValue<boolean>,
      _sizeDelta: PromiseOrValue<BigNumberish>,
      _markPrice: PromiseOrValue<BigNumberish>,
      _isIncrease: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}