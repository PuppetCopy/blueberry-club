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
} from "../common";

export interface TreasuryInterface extends utils.Interface {
  functions: {
    "addLiquidity()": FunctionFragment;
    "addWhitelists(address[])": FunctionFragment;
    "busd()": FunctionFragment;
    "busdBasisPoints()": FunctionFragment;
    "busdHardCap()": FunctionFragment;
    "busdReceived()": FunctionFragment;
    "busdSlotCap()": FunctionFragment;
    "endSwap()": FunctionFragment;
    "extendUnlockTime(uint256)": FunctionFragment;
    "fund()": FunctionFragment;
    "gmt()": FunctionFragment;
    "gmtListingPrice()": FunctionFragment;
    "gmtPresalePrice()": FunctionFragment;
    "gov()": FunctionFragment;
    "increaseBusdBasisPoints(uint256)": FunctionFragment;
    "initialize(address[],uint256[])": FunctionFragment;
    "isInitialized()": FunctionFragment;
    "isLiquidityAdded()": FunctionFragment;
    "isSwapActive()": FunctionFragment;
    "removeWhitelists(address[])": FunctionFragment;
    "router()": FunctionFragment;
    "setFund(address)": FunctionFragment;
    "setGov(address)": FunctionFragment;
    "swap(uint256)": FunctionFragment;
    "swapAmounts(address)": FunctionFragment;
    "swapWhitelist(address)": FunctionFragment;
    "unlockTime()": FunctionFragment;
    "updateWhitelist(address,address)": FunctionFragment;
    "withdrawToken(address,address,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addLiquidity"
      | "addWhitelists"
      | "busd"
      | "busdBasisPoints"
      | "busdHardCap"
      | "busdReceived"
      | "busdSlotCap"
      | "endSwap"
      | "extendUnlockTime"
      | "fund"
      | "gmt"
      | "gmtListingPrice"
      | "gmtPresalePrice"
      | "gov"
      | "increaseBusdBasisPoints"
      | "initialize"
      | "isInitialized"
      | "isLiquidityAdded"
      | "isSwapActive"
      | "removeWhitelists"
      | "router"
      | "setFund"
      | "setGov"
      | "swap"
      | "swapAmounts"
      | "swapWhitelist"
      | "unlockTime"
      | "updateWhitelist"
      | "withdrawToken"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addLiquidity",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "addWhitelists",
    values: [PromiseOrValue<string>[]]
  ): string;
  encodeFunctionData(functionFragment: "busd", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "busdBasisPoints",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "busdHardCap",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "busdReceived",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "busdSlotCap",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "endSwap", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "extendUnlockTime",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(functionFragment: "fund", values?: undefined): string;
  encodeFunctionData(functionFragment: "gmt", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "gmtListingPrice",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "gmtPresalePrice",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "gov", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "increaseBusdBasisPoints",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [PromiseOrValue<string>[], PromiseOrValue<BigNumberish>[]]
  ): string;
  encodeFunctionData(
    functionFragment: "isInitialized",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "isLiquidityAdded",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "isSwapActive",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "removeWhitelists",
    values: [PromiseOrValue<string>[]]
  ): string;
  encodeFunctionData(functionFragment: "router", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "setFund",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setGov",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "swap",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "swapAmounts",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "swapWhitelist",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "unlockTime",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "updateWhitelist",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawToken",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "addLiquidity",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "addWhitelists",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "busd", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "busdBasisPoints",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "busdHardCap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "busdReceived",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "busdSlotCap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "endSwap", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "extendUnlockTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "fund", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "gmt", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "gmtListingPrice",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "gmtPresalePrice",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "gov", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "increaseBusdBasisPoints",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "isInitialized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isLiquidityAdded",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isSwapActive",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "removeWhitelists",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "router", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setFund", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setGov", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swap", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "swapAmounts",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "swapWhitelist",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "unlockTime", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "updateWhitelist",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawToken",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Treasury extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: TreasuryInterface;

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
    addLiquidity(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    addWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    busd(overrides?: CallOverrides): Promise<[string]>;

    busdBasisPoints(overrides?: CallOverrides): Promise<[BigNumber]>;

    busdHardCap(overrides?: CallOverrides): Promise<[BigNumber]>;

    busdReceived(overrides?: CallOverrides): Promise<[BigNumber]>;

    busdSlotCap(overrides?: CallOverrides): Promise<[BigNumber]>;

    endSwap(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    extendUnlockTime(
      _unlockTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    fund(overrides?: CallOverrides): Promise<[string]>;

    gmt(overrides?: CallOverrides): Promise<[string]>;

    gmtListingPrice(overrides?: CallOverrides): Promise<[BigNumber]>;

    gmtPresalePrice(overrides?: CallOverrides): Promise<[BigNumber]>;

    gov(overrides?: CallOverrides): Promise<[string]>;

    increaseBusdBasisPoints(
      _busdBasisPoints: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    initialize(
      _addresses: PromiseOrValue<string>[],
      _values: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    isInitialized(overrides?: CallOverrides): Promise<[boolean]>;

    isLiquidityAdded(overrides?: CallOverrides): Promise<[boolean]>;

    isSwapActive(overrides?: CallOverrides): Promise<[boolean]>;

    removeWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    router(overrides?: CallOverrides): Promise<[string]>;

    setFund(
      _fund: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setGov(
      _gov: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    swap(
      _busdAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    swapAmounts(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    swapWhitelist(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    unlockTime(overrides?: CallOverrides): Promise<[BigNumber]>;

    updateWhitelist(
      prevAccount: PromiseOrValue<string>,
      nextAccount: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    withdrawToken(
      _token: PromiseOrValue<string>,
      _account: PromiseOrValue<string>,
      _amount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  addLiquidity(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  addWhitelists(
    _accounts: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  busd(overrides?: CallOverrides): Promise<string>;

  busdBasisPoints(overrides?: CallOverrides): Promise<BigNumber>;

  busdHardCap(overrides?: CallOverrides): Promise<BigNumber>;

  busdReceived(overrides?: CallOverrides): Promise<BigNumber>;

  busdSlotCap(overrides?: CallOverrides): Promise<BigNumber>;

  endSwap(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  extendUnlockTime(
    _unlockTime: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  fund(overrides?: CallOverrides): Promise<string>;

  gmt(overrides?: CallOverrides): Promise<string>;

  gmtListingPrice(overrides?: CallOverrides): Promise<BigNumber>;

  gmtPresalePrice(overrides?: CallOverrides): Promise<BigNumber>;

  gov(overrides?: CallOverrides): Promise<string>;

  increaseBusdBasisPoints(
    _busdBasisPoints: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  initialize(
    _addresses: PromiseOrValue<string>[],
    _values: PromiseOrValue<BigNumberish>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  isInitialized(overrides?: CallOverrides): Promise<boolean>;

  isLiquidityAdded(overrides?: CallOverrides): Promise<boolean>;

  isSwapActive(overrides?: CallOverrides): Promise<boolean>;

  removeWhitelists(
    _accounts: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  router(overrides?: CallOverrides): Promise<string>;

  setFund(
    _fund: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setGov(
    _gov: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  swap(
    _busdAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  swapAmounts(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  swapWhitelist(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  unlockTime(overrides?: CallOverrides): Promise<BigNumber>;

  updateWhitelist(
    prevAccount: PromiseOrValue<string>,
    nextAccount: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  withdrawToken(
    _token: PromiseOrValue<string>,
    _account: PromiseOrValue<string>,
    _amount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    addLiquidity(overrides?: CallOverrides): Promise<void>;

    addWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: CallOverrides
    ): Promise<void>;

    busd(overrides?: CallOverrides): Promise<string>;

    busdBasisPoints(overrides?: CallOverrides): Promise<BigNumber>;

    busdHardCap(overrides?: CallOverrides): Promise<BigNumber>;

    busdReceived(overrides?: CallOverrides): Promise<BigNumber>;

    busdSlotCap(overrides?: CallOverrides): Promise<BigNumber>;

    endSwap(overrides?: CallOverrides): Promise<void>;

    extendUnlockTime(
      _unlockTime: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    fund(overrides?: CallOverrides): Promise<string>;

    gmt(overrides?: CallOverrides): Promise<string>;

    gmtListingPrice(overrides?: CallOverrides): Promise<BigNumber>;

    gmtPresalePrice(overrides?: CallOverrides): Promise<BigNumber>;

    gov(overrides?: CallOverrides): Promise<string>;

    increaseBusdBasisPoints(
      _busdBasisPoints: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    initialize(
      _addresses: PromiseOrValue<string>[],
      _values: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<void>;

    isInitialized(overrides?: CallOverrides): Promise<boolean>;

    isLiquidityAdded(overrides?: CallOverrides): Promise<boolean>;

    isSwapActive(overrides?: CallOverrides): Promise<boolean>;

    removeWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: CallOverrides
    ): Promise<void>;

    router(overrides?: CallOverrides): Promise<string>;

    setFund(
      _fund: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setGov(
      _gov: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    swap(
      _busdAmount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    swapAmounts(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    swapWhitelist(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    unlockTime(overrides?: CallOverrides): Promise<BigNumber>;

    updateWhitelist(
      prevAccount: PromiseOrValue<string>,
      nextAccount: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    withdrawToken(
      _token: PromiseOrValue<string>,
      _account: PromiseOrValue<string>,
      _amount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    addLiquidity(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    addWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    busd(overrides?: CallOverrides): Promise<BigNumber>;

    busdBasisPoints(overrides?: CallOverrides): Promise<BigNumber>;

    busdHardCap(overrides?: CallOverrides): Promise<BigNumber>;

    busdReceived(overrides?: CallOverrides): Promise<BigNumber>;

    busdSlotCap(overrides?: CallOverrides): Promise<BigNumber>;

    endSwap(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    extendUnlockTime(
      _unlockTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    fund(overrides?: CallOverrides): Promise<BigNumber>;

    gmt(overrides?: CallOverrides): Promise<BigNumber>;

    gmtListingPrice(overrides?: CallOverrides): Promise<BigNumber>;

    gmtPresalePrice(overrides?: CallOverrides): Promise<BigNumber>;

    gov(overrides?: CallOverrides): Promise<BigNumber>;

    increaseBusdBasisPoints(
      _busdBasisPoints: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    initialize(
      _addresses: PromiseOrValue<string>[],
      _values: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    isInitialized(overrides?: CallOverrides): Promise<BigNumber>;

    isLiquidityAdded(overrides?: CallOverrides): Promise<BigNumber>;

    isSwapActive(overrides?: CallOverrides): Promise<BigNumber>;

    removeWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    router(overrides?: CallOverrides): Promise<BigNumber>;

    setFund(
      _fund: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setGov(
      _gov: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    swap(
      _busdAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    swapAmounts(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    swapWhitelist(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    unlockTime(overrides?: CallOverrides): Promise<BigNumber>;

    updateWhitelist(
      prevAccount: PromiseOrValue<string>,
      nextAccount: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    withdrawToken(
      _token: PromiseOrValue<string>,
      _account: PromiseOrValue<string>,
      _amount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addLiquidity(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    addWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    busd(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    busdBasisPoints(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    busdHardCap(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    busdReceived(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    busdSlotCap(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    endSwap(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    extendUnlockTime(
      _unlockTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    fund(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    gmt(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    gmtListingPrice(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    gmtPresalePrice(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    gov(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    increaseBusdBasisPoints(
      _busdBasisPoints: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    initialize(
      _addresses: PromiseOrValue<string>[],
      _values: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    isInitialized(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    isLiquidityAdded(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    isSwapActive(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    removeWhitelists(
      _accounts: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    router(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setFund(
      _fund: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setGov(
      _gov: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    swap(
      _busdAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    swapAmounts(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    swapWhitelist(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    unlockTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    updateWhitelist(
      prevAccount: PromiseOrValue<string>,
      nextAccount: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    withdrawToken(
      _token: PromiseOrValue<string>,
      _account: PromiseOrValue<string>,
      _amount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}