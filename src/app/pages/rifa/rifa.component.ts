import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

// EXCEL
import * as XLSX from 'xlsx';

import SwiperCore, { FreeMode, Navigation, Pagination, Scrollbar, A11y, Autoplay, EffectFade } from 'swiper';
// install Swiper modules
SwiperCore.use([FreeMode, Navigation, Pagination, Scrollbar, A11y, Autoplay, EffectFade]);

import { Rifa } from 'src/app/models/rifas.model';
import { Ruta } from 'src/app/models/rutas.model';
import { Ticket, _pagos } from 'src/app/models/ticket.model';
import { User } from 'src/app/models/users.model';
import { Movimiento } from 'src/app/models/movimientos.model';

import { FileUploadService } from 'src/app/services/file-upload.service';
import { RifasService } from 'src/app/services/rifas.service';
import { RutasService } from 'src/app/services/rutas.service';
import { TicketsService } from 'src/app/services/tickets.service';
import { UsersService } from 'src/app/services/users.service';
import { MovimientosService } from 'src/app/services/movimientos.service';

@Component({
  selector: 'app-rifa',
  templateUrl: './rifa.component.html',
  styleUrls: ['./rifa.component.css']
})
export class RifaComponent implements OnInit {

  public user!: User;

  constructor(  private activatedRoute: ActivatedRoute,
                private usersService: UsersService,
                private rifasService: RifasService,
                private ticketsService: TicketsService,
                private rutasService: RutasService,
                private movimientosService: MovimientosService,
                private fileUploadService: FileUploadService,
                private fb: FormBuilder){

    this.user = usersService.user;

    activatedRoute.params.subscribe( ({id}) => {
      this.loadRifa(id);      
    });

  }

  ngOnInit(): void {  
    
  }

  /** ================================================================
   *  ACTUALIZAR FECHA
  ==================================================================== */
  @ViewChild('upDate') upDate!: ElementRef;
  actualizarFecha( fecha: any ){
    

    if (fecha.length === 0) {
      Swal.fire('Atención', 'Debes de asignar la nueva fecha de la rifa para actualizarla', 'warning');
      return;
    }

    Swal.fire({
      title: "Estas seguro?",
      text: "De actualizar la fecha de la rifa!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, actualizar!",
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        
        fecha = new Date(fecha);

        this.rifasService.updateRifa( {fecha}, this.rifa.rifid! )
            .subscribe( ({ rifa }) => {

              this.rifa.fecha = rifa.fecha;
              this.upDate.nativeElement.value = '';
              Swal.fire('Estupendo', 'Se ha actualizado la fecha exitosamente!', 'success');

            }, (err) => {
              console.log(err);
              Swal.fire('Error', err.error.msg, 'error');
              
            })

      }
    });    

  }

  /** ================================================================
   *  CERRAR RIFA
  ==================================================================== */
  close(abierta: boolean){
    
    let textL;

    if (abierta) {
      abierta = false;
      textL = 'cerrar';

    }else{
      abierta = true;
      textL = 'abrir';
    }

    Swal.fire({
      title: "Estas seguro?",
      text: `De ${textL} la venta de tickets`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Si, ${textL}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      
      this.rifasService.updateRifa({abierta}, this.rifa.rifid!)
          .subscribe( ({rifa}) => {

            this.rifa.abierta = rifa.abierta;
            Swal.fire('Estupendo', 'Se ha actualizado la rifa exitosamente', 'success');

          }, (err) => {
            console.log(err);
            Swal.fire('Error', err.error.msg, 'error');            
          })

    });

  }

  /** ======================================================================
   * LOAD VENDEDORES
  ====================================================================== */
  public vendedores: User[] = [];

  loadVendedores(){

    const query:any = {
      desde: 0,
      hasta: 100000,
      admin: this.rifa.admin,
    }

    this.usersService.loadUsers(query)
        .subscribe( ({ users }) => {

          this.vendedores = users;

        }, (err) => { Swal.fire('Error', err.error.msg, 'error') });

  }

  /** ======================================================================
   * LOAD RUTAS
  ====================================================================== */
  public rutas: Ruta[] = [];
  loadRutas(){    

    let admin = this.rifa.admin;

    this.rutasService.loadRutas({admin, status: true})
        .subscribe( ({rutas, total}) => {          
          this.rutas = rutas;
        });

  }

  /** ======================================================================
   * LOAD RIFA ID
  ====================================================================== */
  public rifa!: Rifa;
  loadRifa(id: string){

    this.rifasService.loadRifaID(id)
        .subscribe( ({rifa}) => {          

          this.rifa = rifa;
          this.query.rifa = rifa.rifid!;          

          this.loadTickets();
          // LOAD VENDEDORES
          this.loadVendedores();
          // LOAD RUTAS
          this.loadRutas();

          this.newRifaForm.setValue({
            name: this.rifa.name,
            monto: this.rifa.monto.toString(),
            loteria: this.rifa.loteria,
            descripcion: this.rifa.descripcion,
            promocion: this.rifa.promocion,
            comision: this.rifa.comision
          })
          

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');
          
        })

  }

  /** ======================================================================
   * NEW RIFA
  ====================================================================== */
  public newRifaFormSubmitted: boolean = false;
  public newRifaForm = this.fb.group({
    name: ['', [Validators.required]],
    monto: ['', [Validators.required]],
    promocion: 0,
    comision: 0,
    loteria: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
  })

  update(){

    this.newRifaFormSubmitted = true;

    if (this.newRifaForm.invalid) {
      return;
    }

    this.rifasService.updateRifa(this.newRifaForm.value, this.rifa.rifid!)
        .subscribe( ({rifa}) => {          
          
          this.newRifaFormSubmitted = false;

          this.rifa.name = rifa.name;
          this.rifa.monto = rifa.monto;
          this.rifa.promocion = rifa.promocion;
          this.rifa.comision = rifa.comision;
          this.rifa.loteria = rifa.loteria;
          this.rifa.descripcion = rifa.descripcion;
          
          Swal.fire('Estupendo', 'Se ha actualizado la rifa exitosamente', 'success');

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

  }

  /** ======================================================================
   * VALIDATE RIFA
  ====================================================================== */
  validate(campo: string): boolean{

    if (this.newRifaFormSubmitted && this.newRifaForm.get(campo)?.invalid) {
      return true;
    }else{
      return false;
    }

  }


  /** ======================================================================
   * LOAD TICKETS
  ====================================================================== */
  public tickets: Ticket[] = [];
  public total: number = 0;
  public disponibles: number = 0;
  public apartados: number = 0;
  public pagados: number = 0;
  public query: any = {
    desde: 0,
    hasta: 100
  }

  loadTickets(){

    this.query.rifa = this.rifa.rifid!;

    if (this.user.role !== 'ADMIN') {
      if (!this.query.estado) {
        this.query.estado = 'Disponible';
      }
    }

    this.ticketsService.loadTickets(this.query)
        .subscribe( ({tickets, total, disponibles, apartados, pagados}) => {

          this.tickets = tickets;
          this.total = total;
          this.disponibles = disponibles;
          this.apartados = apartados;
          this.pagados = pagados;

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

  }

  /** ======================================================================
   * LOAD TICKETS POR ESTADO
  ====================================================================== */
  searchEstado(estado: string){

    if (estado === 'total') {
      delete this.query.estado;      
    }else{
      this.query.estado = estado;

      if (this.user.role !== 'ADMIN' && estado !== 'Disponible') {
        this.query.vendedor = this.user.uid;
      }else{
        delete this.query.vendedor;
      }
    }   

    this.loadTickets();

  }

  /** ================================================================
   *   CAMBIAR PAGINA
  ==================================================================== */
  @ViewChild('mostrar') mostrar!: ElementRef;
  cambiarPagina (valor: number){
    
    this.query.desde += valor;

    if (this.query.desde < 0) {
      this.query.desde = 0;
    }
    
    this.loadTickets();
    
  }

  /** ================================================================
   *   CHANGE LIMITE
  ==================================================================== */
  limiteChange( cantidad: any ){
    this.query.hasta = Number(cantidad);    
    this.loadTickets();
  }

  /** ================================================================
   *   SELECT TICKET
  ==================================================================== */
  public paymentsTicket: _pagos[] = [];
  public totalPaid: number = 0;
  public loadingTicket: boolean = false;
  public ticketSelected!: Ticket;
  public ticketWhatsapp: string = '';
  selectTicket(ticket: Ticket){

    this.loadingTicket = true;
    this.paymentsTicket = [];
    this.totalPaid = 0;
    
    this.ticketsService.loadTicketID(ticket.tid!)
    .subscribe( ({ticket}) => {
      
          this.ticketSelected = ticket;
          this.paymentsTicket = ticket.pagos;

          
          if (this.paymentsTicket.length > 0) {
            for (const paid of this.paymentsTicket) {
              this.totalPaid += paid.monto;
            }            
          }

          let hora = new Date(this.rifa.fecha).getHours();
          let forma = 'AM';

          if (hora > 12) {
            hora -= 12;
            forma = 'PM';
          }
          
          this.ticketWhatsapp = `${this.rifa.admin.empresa} \n*Premio:* ${this.rifa.name} \n*Numero:* ${this.ticketSelected.numero} \n*Valor:* $${this.ticketSelected.monto} \n*Pagado:* $${this.totalPaid} \n*Resta:* $${this.ticketSelected.monto - this.totalPaid} \n*Loteria:* ${this.rifa.loteria} \n*Fecha:* ${new Date(this.rifa.fecha).getDate()}/${new Date(this.rifa.fecha).getMonth()+1}/${new Date(this.rifa.fecha).getFullYear()} ${hora}:${new Date(this.rifa.fecha).getMinutes()} ${forma} \nhttps://drawve.com/rifa/${this.rifa.rifid!}`;
          
          setTimeout( () =>{

            if (ticket.disponible) {
              this.ticketUpdate.reset({
                tid: ticket.tid!,
                estado: 'Disponible',
                vendedor: this.user.uid!,
                disponible: true
              });
              this.loadingTicket = false;
              return;
            }

            this.loadingTicket = false;
            this.ticketUpdate.setValue({
              tid: ticket.tid!,
              nombre: ticket.nombre,
              telefono: ticket.telefono,
              cedula: ticket.cedula,
              direccion: ticket.direccion,
              ruta: ticket.ruta._id! || '',
              estado: ticket.estado,
              nota: ticket.nota,
              vendedor: this.user.uid!,
              monto: ticket.monto,
              disponible: false
            })
  
            
          },1000 )


        })

  }

  /** ================================================================
   *   UPDATE TICKET
  ==================================================================== */
  public ticketUpdateSubmitted: boolean = false;
  public ticketUpdate = this.fb.group({
    tid: [''],
    nombre: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    cedula: ['', [Validators.required]],
    direccion: ['', [Validators.required]],
    ruta: ['', [Validators.required]],
    estado: 'Disponible',
    nota: '',
    vendedor: '',
    monto: 0,
    disponible: false
  })

  updateTicket(){

    this.ticketUpdateSubmitted = true;
    
    if (this.ticketUpdate.invalid) {
      return;
    }

    if (this.ticketUpdate.value.estado !== 'Disponible') {
      this.ticketUpdate.value.disponible = false;
    }else{
      this.ticketUpdate.value.disponible = true;
    }
    
    this.ticketsService.updateTicket(this.ticketUpdate.value, this.ticketUpdate.value.tid!)
        .subscribe( ({ticket}) => {

          this.tickets.map( (tic) => {
            if (tic.tid === ticket.tid) {
              tic.estado = ticket.estado;
            }
          });

          this.ticketUpdateSubmitted = false;
          this.ticketSelected = ticket;

          let hora = new Date(this.rifa.fecha).getHours();
          let forma = 'AM';
          if (hora > 12) {
            hora -= 12;
            forma = 'PM';
          }
          
          this.ticketWhatsapp = `${this.rifa.admin.empresa} \n*Premio:* ${this.rifa.name} \n*Numero:* ${this.ticketSelected.numero} \n*Valor:* $${this.ticketSelected.monto} \n*Pagado:* $${this.totalPaid} \n*Resta:* $${this.ticketSelected.monto - this.totalPaid} \n*Loteria:* ${this.rifa.loteria} \n*Fecha:* ${new Date(this.rifa.fecha).getDate()}/${new Date(this.rifa.fecha).getMonth()+1}/${new Date(this.rifa.fecha).getFullYear()} ${hora}:${new Date(this.rifa.fecha).getMinutes()} ${forma} \nhttps://drawve.com/rifa/${this.rifa.rifid!}`;
          
          Swal.fire('Estupendo', 'Se ha actualizado el ticket exitosamente', 'success');

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })
    

  }

  /** ================================================================
   *   VALIDATE UPDATE TICKET
  ==================================================================== */
  validateUpTicket(campo: string): boolean{

    if (this.ticketUpdateSubmitted && this.ticketUpdate.get(campo)?.invalid ) {
      return true;
    }else{
      return false;
    }

  }

  /** ================================================================
   *   UPDATE LIST TICKETS
  ==================================================================== */
  updateListTikcets(){

    this.ticketUpdateSubmitted = true;
    
    if (this.ticketUpdate.invalid) {
      return;
    }

    if (this.ticketUpdate.value.estado !== 'Disponible') {
      this.ticketUpdate.value.disponible = false;
    }else{
      this.ticketUpdate.value.disponible = true;
    }

    this.ticketUpdate.value.vendedor = this.user.uid;
    
    let i = 0;
    
    for  (const ticket of this.listTicketsSelect) {

      this.ticketUpdate.value.tid = ticket.tid!;      

      this.ticketsService.updateTicket(this.ticketUpdate.value, ticket.tid!)
        .subscribe( ({ticket}) => {

          this.tickets.map( (tic) => {
            if (tic.tid === ticket.tid) {
              tic.estado = ticket.estado;
            }
          });

          this.ticketUpdateSubmitted = false;
          i++;
          
          if (i === this.listTicketsSelect.length) {
            Swal.fire('Estupendo', `Se actualizaron ${i} tickets`, 'success');
            this.listTicketsSelect = [];
            this.ticketUpdate.reset({
              estado: 'Disponible',
              disponible: false
            })
          }

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })
    }    

  }

  /** ================================================================
   *   ADD PAID
  ==================================================================== */
  @ViewChild('desc') desc!: ElementRef;
  @ViewChild('monto') monto!: ElementRef;

  addPaid(descripcion: string, monto: any){

    monto = Number(monto);

    if (monto <= 0) {
      Swal.fire('Atención', 'Debes de agregar un monto valido', 'warning');
      return;
    }

    // COMPROBAR QUE EL ABONO NO SEA MAYOR AL TOTAL DEL TICKET
    if ((this.totalPaid + monto) > this.ticketSelected.monto) {
      monto = this.ticketSelected.monto - this.totalPaid;
    }

    let estado = 'Confirmado';

    if (this.user.uid !== this.rifa.admin.uid) {
      estado = 'Pendiente';
    }

    this.totalPaid += monto;
    this.paymentsTicket.push({
      descripcion,
      estado,
      user: this.user.uid,
      monto
    });

    let campos: any = {
      pagos: this.paymentsTicket
    }

    if (this.totalPaid >= this.ticketSelected.monto) {
      campos.estado = 'Pagado';
      this.ticketUpdate.value.estado = 'Pagado';
    }else{
      campos.estado = 'Apartado';
      this.ticketUpdate.value.estado = 'Apartado';
    }

    this.ticketsService.updateTicket(campos, this.ticketUpdate.value.tid!)
        .subscribe( ({ ticket }) => {

          Swal.fire('Estupendo', 'Se ha agregado el pago exitosamente!', 'success');

          this.paymentsTicket = [];
          this.totalPaid = 0;

          this.paymentsTicket = ticket.pagos;
          if (this.paymentsTicket.length > 0) {
            for (const paid of this.paymentsTicket) {
              this.totalPaid += paid.monto;
            }            
          }

          this.tickets.map( (tic) => {
            if (tic.tid === ticket.tid) {
              tic.estado = ticket.estado;
            }
          });

          this.ticketSelected = ticket;

          let hora = new Date(this.rifa.fecha).getHours();
          let forma = 'AM';

          if (hora > 12) {
            hora -= 12;
            forma = 'PM';
          }
          
          this.ticketWhatsapp = `${this.rifa.admin.empresa} \n*Premio:* ${this.rifa.name} \n*Numero:* ${this.ticketSelected.numero} \n*Valor:* $${this.ticketSelected.monto} \n*Pagado:* $${this.totalPaid} \n*Resta:* $${this.ticketSelected.monto - this.totalPaid} \n*Loteria:* ${this.rifa.loteria} \n*Fecha:* ${new Date(this.rifa.fecha).getDate()}/${new Date(this.rifa.fecha).getMonth()+1}/${new Date(this.rifa.fecha).getFullYear()} ${hora}:${new Date(this.rifa.fecha).getMinutes()} ${forma} \nhttps://drawve.com/rifa/${this.rifa.rifid!}`;
          

          this.desc.nativeElement.value = '';
          this.monto.nativeElement.value = '';

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })


  }

  /** ================================================================
   *   DELETE PAID
  ==================================================================== */
  deletePaid(i:any){

    Swal.fire({
      title: "Estas seguro?",
      text: "De eliminar este pago!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Si, eliminar!"
    }).then((result) => {
      if (result.isConfirmed) {
        
        this.paymentsTicket.splice(i, 1);
        this.totalPaid = 0;
        if (this.paymentsTicket.length > 0) {
          for (const paid of this.paymentsTicket) {
            this.totalPaid += paid.monto;
          }            
        }

        let campos: any = {
          pagos: this.paymentsTicket
        }

        if (this.totalPaid >= this.ticketSelected.monto) {
          campos.estado = 'Pagado';
          this.ticketUpdate.value.estado = 'Pagado';
        }else{
          campos.estado = 'Apartado';
          this.ticketUpdate.value.estado = 'Apartado';
        }

        this.ticketsService.updateTicket(campos, this.ticketUpdate.value.tid!)
        .subscribe( ({ ticket }) => {

          Swal.fire('Estupendo', 'Se ha agregado el pago exitosamente!', 'success');

          this.paymentsTicket = [];
          this.totalPaid = 0;

          this.paymentsTicket = ticket.pagos;
          if (this.paymentsTicket.length > 0) {
            for (const paid of this.paymentsTicket) {
              this.totalPaid += paid.monto;
            }            
          }

          this.tickets.map( (tic) => {
            if (tic.tid === ticket.tid) {
              tic.estado = ticket.estado;
            }
          });

          this.ticketSelected = ticket;

          let hora = new Date(this.rifa.fecha).getHours();
          let forma = 'AM';

          if (hora > 12) {
            hora -= 12;
            forma = 'PM';
          }
          
          this.ticketWhatsapp = `${this.rifa.admin.empresa} \n*Premio:* ${this.rifa.name} \n*Numero:* ${this.ticketSelected.numero} \n*Valor:* $${this.ticketSelected.monto} \n*Pagado:* $${this.totalPaid} \n*Resta:* $${this.ticketSelected.monto - this.totalPaid} \n*Loteria:* ${this.rifa.loteria} \n*Fecha:* ${new Date(this.rifa.fecha).getDate()}/${new Date(this.rifa.fecha).getMonth()+1}/${new Date(this.rifa.fecha).getFullYear()} ${hora}:${new Date(this.rifa.fecha).getMinutes()} ${forma} \nhttps://drawve.com/rifa/${this.rifa.rifid!}`;
          

          this.desc.nativeElement.value = '';
          this.monto.nativeElement.value = '';

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

      }
    });

  }

  /** ================================================================
   *   FILTRAR POR RUTA
  ==================================================================== */
  filterRuta(ruta: string){

    if (ruta === 'Todos') {
      delete this.query.ruta;
      this.loadTickets();
      return;
    }

    this.query.ruta = ruta;
    this.loadTickets();

  }

  /** ================================================================
   *   FILTRAR POR VENDEDOR
  ==================================================================== */
  filterVendedor(vendedor: string){

    if (vendedor === 'Todos') {
      delete this.query.vendedor;
      this.loadTickets();
      return;
    }

    this.query.vendedor = vendedor;
    this.loadTickets();

  }

  /** ================================================================
   *   SEARCH TICKET FOR CLIENT
  ==================================================================== */
  search(busqueda: string){

    if (busqueda.length === 0) {
      return;
    }

    this.ticketsService.searchTicket(busqueda, this.rifa.rifid!)
        .subscribe( ({tickets}) => {
          this.tickets = tickets;
        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');
          
        })

  }

  /** ================================================================
   *   ADD PAID
  ==================================================================== */
  @ViewChild('nameM') nameM!: ElementRef;
  @ViewChild('descM') descM!: ElementRef;
  @ViewChild('cuentaM') cuentaM!: ElementRef;

  addMetodoPaid(name: string, descripcion: string, cuenta: string){
    
    if (name.length === 0 || descripcion.length === 0 || cuenta.length === 0) {
      Swal.fire('Atención', 'Debes de llenar los campos obligatorios', 'warning');
      return;
    }

    this.rifa.metodos.push({
      name,
      descripcion,
      cuenta
    })

    this.rifasService.updateRifa({metodos: this.rifa.metodos}, this.rifa.rifid!)
        .subscribe( ({ rifa }) => {

          Swal.fire('Estupendo', 'Se ha agregado el metodo pago exitosamente!', 'success');

          this.nameM.nativeElement.value = '';
          this.descM.nativeElement.value = '';
          this.cuentaM.nativeElement.value = '';

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })


  }

  /** ================================================================
   *   DELETE PAID
  ==================================================================== */
  deleteMetodoPaid(i:any){

    Swal.fire({
      title: "Estas seguro?",
      text: "De eliminar este metodo pago!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Si, eliminar!"
    }).then((result) => {
      if (result.isConfirmed) {
        
        this.rifa.metodos.splice(i, 1);

        this.rifasService.updateRifa({metodos: this.rifa.metodos}, this.rifa.rifid!)
        .subscribe( ({ rifa }) => {

          Swal.fire('Estupendo', 'Se ha eliminado el metodo pago exitosamente!', 'success');

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

      }
    });

  }

  /** ================================================================
   *   ADD PAID
  ==================================================================== */
  @ViewChild('nameP') nameP!: ElementRef;
  @ViewChild('descripcionP') descripcionP!: ElementRef;
  @ViewChild('fechaP') fechaP!: ElementRef;

  addPremios(name: string, descripcion: string, fecha: any){
    
    if (name.length === 0 || descripcion.length === 0 || fecha.length === 0) {
      Swal.fire('Atención', 'Debes de llenar los campos obligatorios', 'warning');
      return;
    }

    this.rifa.premios.push({
      name,
      descripcion,
      fecha: new Date(fecha)
    })

    this.rifasService.updateRifa({premios: this.rifa.premios}, this.rifa.rifid!)
        .subscribe( ({ rifa }) => {

          Swal.fire('Estupendo', 'Se ha agregado el premio especial exitosamente!', 'success');

          this.nameP.nativeElement.value = '';
          this.descripcionP.nativeElement.value = '';
          this.fechaP.nativeElement.value = '';

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })


  }

  /** ================================================================
   *   DELETE PAID
  ==================================================================== */
  deletePremio(i:any){

    Swal.fire({
      title: "Estas seguro?",
      text: "De eliminar este premio especial!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Si, eliminar!"
    }).then((result) => {
      if (result.isConfirmed) {
        
        this.rifa.premios.splice(i, 1);

        this.rifasService.updateRifa({premios: this.rifa.premios}, this.rifa.rifid!)
        .subscribe( ({ rifa }) => {

          Swal.fire('Estupendo', 'Se ha eliminado el premio especial exitosamente!', 'success');

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

      }
    });

  }

  /** ================================================================
   *   ACTUALIZAR IMAGEN
  ==================================================================== */
  public imgTempP: any = null;
  public subirImagen!: any;
  cambiarImage(file: any): any{  
    
    this.subirImagen = file.target.files[0];
    
    if (!this.subirImagen) { return this.imgTempP = null }    
    
    const reader = new FileReader();
    const url64 = reader.readAsDataURL(file.target.files[0]);
        
    reader.onloadend = () => {
      this.imgTempP = reader.result;      
    }

  }

  /** ================================================================
   *  SUBIR IMAGEN
  ==================================================================== */
  @ViewChild('fileImg') fileImg!: ElementRef;
  public imgPerfil: string = 'no-image';
  subirImg(){
    
    this.fileUploadService.updateImage( this.subirImagen, 'rifa', this.rifa.rifid!)
    .then( 
      (resp:{ date: Date, nombreArchivo: string, ok: boolean }) => {
        
        this.rifa.img.push({
          img: resp.nombreArchivo,
          fecha: resp.date
        })
      }
    );
    
    this.fileImg.nativeElement.value = '';
    this.imgTempP = null;
    
  }

  /** ================================================================
   *  ELIMINAR IMAGEN
  ==================================================================== */
  deleImg(img: string){

    this.fileUploadService.deleteFile(img, this.rifa.rifid!, 'rifa')
        .subscribe( (resp: {rifa: Rifa}) => {
          
          this.rifa.img = resp.rifa.img;
          Swal.fire('Estupendo', 'Se ha eliminado la imagen exitosamente!', 'success');
          
        }, (err)  => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        });

  }

  /** ================================================================
   *  CONFIG SWIPER
  ==================================================================== */  
  public config = {
    slidesPerView:1,
    spaceBetween:10,
    centeredSlides: true,
    navigation: true,
    pagination: { clickable: true, dynamicBullets: true },
    breakpoints:{
      '450': {
        slidesPerView: 2,
        spaceBetween: 20,
        centeredSlides: false,
      },
      '640': {
        slidesPerView: 3,
        spaceBetween: 30,
        centeredSlides: false,
      },
      '768': {
        slidesPerView: 3,
        spaceBetween: 40,
        centeredSlides: false,
      },
    }

  }

  /** ================================================================
   *   ENVIAR WHATSAPP
  ==================================================================== */
  sendWhatsapp(msg: string){
    
    let text = msg.replaceAll(' ','+').replaceAll('\n' , '%0A');

    // window.open(`https://wa.me/${this.ticketSelected.telefono}?text=${text}`, '_blank')
    window.open(`whatsapp://send?text=${text}&phone=${this.ticketSelected.telefono}`)
    window.open(`whatsapp://send?text=${text}&phone=+573115620187`)
    
  }


  /** ================================================================
   *  CLIPBOARD
  ==================================================================== */
  copyToClipboard() {
    document.addEventListener('copy', (e: ClipboardEvent) => {
      e.clipboardData!.setData('text/plain', (`https://drawve.com/rifa/${this.rifa.rifid!}`));
      e.preventDefault();
      document.removeEventListener('copy', null!);
    });
    document.execCommand('copy');
  }

  /** ================================================================
   *   SELECT VARIOS
  ==================================================================== */
  public listTicketsSelect: Ticket[] = [];
  addTicketList(ticket: Ticket){

    const validarItem = this.listTicketsSelect.findIndex( (tic) =>{      
      if (tic.tid === ticket.tid ) {
        return true;
      }else {
        return false;
      }
    });

    if (validarItem === -1) {      
      this.listTicketsSelect.push(ticket);
    }    

  }

  /** ================================================================
   *   DELET TICKET LIST
  ==================================================================== */
  delTicketList(i: number){
    this.listTicketsSelect.splice(i,1);
  }

  /** ================================================================
   *   VER INGRESOS
  ==================================================================== */
  public apartadosIng: Ticket[] = [];
  public pagadosIng: Ticket[] = [];
  public pendientes: Ticket[] = [];
  public totalApartado: number = 0;
  public totalPendiente: number = 0;
  public totalPendienteCobrar: number = 0;
  public totalPagado: number = 0;
  loadIngresos(){

    this.loadingEgresos = true;

    this.ticketsService.loadIngresosTickets(this.rifa.rifid!)
        .subscribe( ({apartados, pagados, totalApartado,totalPagado, pendientes}) => {

          this.apartadosIng = apartados;
          this.pagadosIng = pagados;
          this.totalApartado = totalApartado;
          this.totalPagado = totalPagado;
          this.pendientes = pendientes;          
          
          for (const tick of pendientes) {

            for (const paid of tick.pagos) {
              
              if (paid.estado === 'Pendiente') {                
                this.totalPendiente += paid.monto;
              }

            }
            
          }

          let monto = 0;
          for (const tick of this.apartadosIng) {
            monto += tick.monto;
          }

          this.totalPendienteCobrar = (monto - this.totalApartado);         
          

          this.loadEgresos();
          
        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

  }

  /** ================================================================
   *   VER EGRESOS
  ==================================================================== */
  public loadingEgresos: boolean = false;
  public egresos: Movimiento[] = [];
  public totalMovimiento: number = 0;
  loadEgresos(){    

    let query = {
      desde:0,
      hasta: 5000,
      rifa: this.rifa.rifid!,
      type: 'Salida'
    }

    this.movimientosService.loadMovimientos(query)
        .subscribe( ({movimientos, total, totalMovimiento}) => {

          this.loadingEgresos = false;
          this.egresos = movimientos;
          this.totalMovimiento = totalMovimiento;

        }, (err) => {
          this.loadingEgresos = false;
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

  }

  /** ================================================================
   *   ADD EGRESOS
  ==================================================================== */
  @ViewChild ('descE') descE!: ElementRef;
  @ViewChild ('montoE') montoE!: ElementRef;
  addEgresos(descripcion: string, monto: any){

    monto = Number(monto);

    if (!monto || monto <= 0) {
      Swal.fire('Atención', 'Debes de agregar un monto valido', 'warning');
      return;      
    }

    let formData = {
      monto,
      descripcion,
      rifa: this.rifa.rifid,
      type: 'Salida'
    }

    this.movimientosService.createMovimiento(formData)
        .subscribe( ({movimiento}) => {

          movimiento.moid = movimiento._id;

          this.egresos.push(movimiento);
          this.totalMovimiento += movimiento.monto;

          this.descE.nativeElement.value = '';
          this.montoE.nativeElement.value = '';
          Swal.fire('Estupendo', 'Se ha agregado el egreso exitosamente!', 'success');

        })

  }


  /** ================================================================
   *   DELETE EGRESOS
  ==================================================================== */
  deleteEgreso(moid: string){

    Swal.fire({
      title: "Estas seguro?",
      text: "De eliminar este egreso!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, eliminar!",
      cancelButtonText: 'cancelar'
    }).then((result) => {
      if (result.isConfirmed) {

        this.movimientosService.deleteMovimiento(moid)
            .subscribe( ({msg}) => {

              Swal.fire('Estupendo', msg, 'success');
              this.loadEgresos();

            }, (err) => {
              console.log(err);
              Swal.fire('Error', err.error.msg, 'error');              
            })

      }
    });

  }

  /** ================================================================
   *   FILTRAR ABONOS PENDIENTES POR VENDEDOR
  ==================================================================== */
  public vendedorSelect: string = '';
  async filterVendedorPendientes(vendedor: string){

    if(vendedor === 'Todos'){
      this.loadIngresos();
      return;
    }
    
    await this.loadIngresos();
    
    setTimeout(() => {


      let totalPendientesT = 0;
      let pendientesT = this.pendientes.filter( (tick) => vendedor == tick.vendedor._id );

      for (const pendienteT of pendientesT) {
        for (const paid of pendienteT.pagos) {

          if (paid.estado === 'Pendiente') {
            totalPendientesT += paid.monto;
          }
          
        }
      }

      this.pendientes = pendientesT;
      this.totalPendiente = totalPendientesT;
      
    }, 500);

  }

  /** ================================================================
   *  CONFIRMAR PAGOS
  ==================================================================== */
  confirmarPago(ticketE: string, pago: string, estado: string){

    this.ticketsService.loadTicketID( ticketE )
        .subscribe( ({ticket}) => {

          ticket.pagos.map( (paid) => {

            if (paid._id === pago) {
              paid.estado = estado
            }

          })

          this.ticketsService.updateTicket( {pagos: ticket.pagos}, ticketE )
              .subscribe( ({ticket} ) => {

                this.pendientes.map( (tick) => {
                  if (tick.tid === ticketE) {
                    
                    tick.pagos.map( (paid) => {
                       
                      if (paid._id === pago) {
                        paid.estado = estado;
                        this.totalPendiente -= paid.monto;
                      }
                    })

                  }
                })

              }, (err) => {
              console.log(err);
              Swal.fire('Error', err.error.msg, 'error');          
            })

        }, (err) => {
          console.log(err);
          Swal.fire('Error', err.error.msg, 'error');          
        })

  }


  /** ================================================================
   *   EXPORTAR EXCEL
  ==================================================================== */
  exportar(){

    let tickets: any[] = [];

    for (const ticket of this.tickets) {

      
      let tick: any = {
        Numero: ticket.numero,
        Monto: ticket.monto,
        Nombres: ticket.nombre || '',
        Cedula: ticket.cedula || '',
        Telefono: ticket.telefono || '',
        Direccion: ticket.direccion || '',
        Estado: ticket.estado
      }

      if (ticket.ruta) {
        tick.Ruta = ticket.ruta.name;
      }

      if (ticket.vendedor) {
        tick.Vendedor = ticket.vendedor.name;
      }

      // CARGAR ABONOS DE CADA TICKET
      tick.Abonado = 0;
      if (ticket.pagos.length > 0) {

        for (let i = 0; i < ticket.pagos.length; i++) {
          const pago = ticket.pagos[i]; 
          tick.Abonado += pago.monto;         
          tick[`Pago${i+1}`] = `${pago.monto}`;
          tick[`Fecha${i+1}`] = `${new Date(pago.fecha!).getDate()}/${new Date(pago.fecha!).getMonth()+1}/${new Date(pago.fecha!).getFullYear()}`;
        }
        
      }     
      
      tickets.push(tick)

    }

    /* generate a worksheet */
    var ws = XLSX.utils.json_to_sheet(tickets);
      
    /* add to workbook */
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");

    /* title */
    let title = `${this.rifa.name}.xls`;

    /* write workbook and force a download */
    XLSX.writeFile(wb, title);


  }


}
