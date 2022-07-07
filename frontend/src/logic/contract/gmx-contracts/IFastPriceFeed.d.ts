/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface IFastPriceFeedInterface extends ethers.utils.Interface {
  functions: {
    "lastUpdatedAt()": FunctionFragment;
    "lastUpdatedBlock()": FunctionFragment;
    "setIsSpreadEnabled(bool)": FunctionFragment;
    "setSigner(address,bool)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "lastUpdatedAt",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "lastUpdatedBlock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setIsSpreadEnabled",
    values: [boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "setSigner",
    values: [string, boolean]
  ): string;

  decodeFunctionResult(
    functionFragment: "lastUpdatedAt",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "lastUpdatedBlock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setIsSpreadEnabled",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setSigner", data: BytesLike): Result;

  events: {};
}

export class IFastPriceFeed extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: IFastPriceFeedInterface;

  functions: {
    lastUpdatedAt(overrides?: CallOverrides): Promise<[BigNumber]>;

    lastUpdatedBlock(overrides?: CallOverrides): Promise<[BigNumber]>;

    setIsSpreadEnabled(
      _isSpreadEnabled: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setSigner(
      _account: string,
      _isActive: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  lastUpdatedAt(overrides?: CallOverrides): Promise<BigNumber>;

  lastUpdatedBlock(overrides?: CallOverrides): Promise<BigNumber>;

  setIsSpreadEnabled(
    _isSpreadEnabled: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setSigner(
    _account: string,
    _isActive: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    lastUpdatedAt(overrides?: CallOverrides): Promise<BigNumber>;

    lastUpdatedBlock(overrides?: CallOverrides): Promise<BigNumber>;

    setIsSpreadEnabled(
      _isSpreadEnabled: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    setSigner(
      _account: string,
      _isActive: boolean,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    lastUpdatedAt(overrides?: CallOverrides): Promise<BigNumber>;

    lastUpdatedBlock(overrides?: CallOverrides): Promise<BigNumber>;

    setIsSpreadEnabled(
      _isSpreadEnabled: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setSigner(
      _account: string,
      _isActive: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    lastUpdatedAt(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    lastUpdatedBlock(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setIsSpreadEnabled(
      _isSpreadEnabled: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setSigner(
      _account: string,
      _isActive: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}