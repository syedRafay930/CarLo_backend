import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bookings } from "./Bookings";
import { Users } from "./Users";

@Index("transactions_pkey", ["id"], { unique: true })
@Index("transactions_transaction_code_key", ["transactionCode"], {
  unique: true,
})
@Entity("transactions", { schema: "public" })
export class Transactions {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("character varying", {
    name: "transaction_code",
    unique: true,
    length: 50,
  })
  transactionCode: string;

  @Column("enum", { name: "method", enum: ["cash", "credit_card"] })
  method: "cash" | "credit_card";

  @Column("enum", {
    name: "status",
    enum: ["pending", "successful", "failed", "refunded", "simulated_cash"],
  })
  status: "pending" | "successful" | "failed" | "refunded" | "simulated_cash";

  @Column("numeric", { name: "amount", precision: 10, scale: 2 })
  amount: string;

  @Column("timestamp without time zone", {
    name: "processed_at",
    default: () => "now()",
  })
  processedAt: Date;

  @ManyToOne(() => Bookings, (bookings) => bookings.transactions)
  @JoinColumn([{ name: "booking_id", referencedColumnName: "id" }])
  booking: Bookings;

  @ManyToOne(() => Users, (users) => users.transactions)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
