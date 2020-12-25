import { HttpErrorResponse } from '@angular/common/http';
import {
	ChangeDetectorRef,
	Component,
	OnDestroy,
	OnInit,
	ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	STChange,
	STColumn,
	STColumnButton,
	STComponent,
	STData,
} from '@delon/abc/st';
import { XlsxService } from '@delon/abc/xlsx';
import { ModalHelper } from '@delon/theme';
import { BlockUIService } from '@shared';
import { CommonService } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Subscription } from 'rxjs';

import * as moment from 'moment';

import { ApplicantViewComponent } from '../applicant-view/applicant-view.component';

@Component({
	selector: 'app-applicant-list',
	templateUrl: './applicant-list.component.html',
})
export class ApplicantListComponent implements OnInit, OnDestroy {
	queryParams: any = {
		pi: 1,
		ps: 10,
		filter: '',
		active: '',
		direction: '',
	};
	total = 0;
	list: any[] = [];
	status = [];
	expoes = [];
	resultStatus: any[] = [];
	@ViewChild('st', { static: true }) st: STComponent;
	columns: STColumn[];
	selectedRows: STData[] = [];
	totalCallNo = 0;

	constructor(
		private cdr: ChangeDetectorRef,
		private blkSrv: BlockUIService,
		private comSrv: CommonService,
		private modal: ModalHelper,
		private modalSrv: NzModalService,
		private msgSrv: NzMessageService,
		private route: ActivatedRoute,
		private xlsx: XlsxService,
	) {}

	ngOnInit() {
		this.status = this.comSrv.expoBuyerStatus;
		this.resultStatus = this.comSrv.expoBuyerResultStatus;
		this.expoes = this.comSrv.getCommonData().expoes;
		this.refreshColumn();
		if (this.route.snapshot.data.filter) {
			this.queryParams.filter = this.route.snapshot.data.filter;
		}
		this.getData();
	}

	ngOnDestroy() {}

	refreshColumn() {
		this.columns = [
			{
				title: '举办名称',
				index: 'expo',
				format: (item, _col) =>
					`${item.expo ? item.expo.name.zh : '-'}`,
				filter: {
					menus: this.expoes,
					multiple: false,
				},
			},
			{
				title: '编号',
				index: 'numbering',
				format: (item, _col) => `${item.cert_code || '-'}`,
			},
			{
				title: '参观者',
				index: 'user',
				format: (item, _col) =>
					`${item.user ? item.user.name.zh : '-'} / ${
						item.user ? item.user.phone : '-'
					} / ${item.user ? item.user.email : '-'}`,
			},
			{
				title: '邀请人数',
				index: 'friend_cnt',
				format: (item, _col) => `${item.friend_cnt}`,
			},
			{
				title: '申请时间',
				type: 'date',
				index: 'created_at',
				sort: true,
			},
			{
				title: '处理状态',
				index: 'status',
				render: 'status',
				filter: {
					menus: this.status,
				},
			},
			{
				title: '参观状态',
				index: 'is_visited',
				render: 'resultStatus',
				filter: {
					menus: this.resultStatus,
				},
			},
			{
				title: '操作',
				buttons: [
					{
						text: '详情',
						click: (item: any) => this.openApplicantView(item),
					},
				],
			},
		];
	}

	getData() {
		this.blkSrv.setBlockStatus(true);
		Object.entries(this.queryParams).forEach(([key, value]) => {
			this.queryParams[key] = value || '';
		});
		this.comSrv.getExpoApplicantBuyers({ ...this.queryParams }).subscribe(
			(res: any) => {
				this.blkSrv.setBlockStatus(false);
				console.log('applicant buyer list', res);
				this.total = res.data.total;
				this.list = res.data.list;
				this.cdr.detectChanges();
			},
			(err: HttpErrorResponse) => {
				this.blkSrv.setBlockStatus(false);
			},
		);
	}

	stChange(e: STChange) {
		switch (e.type) {
			case 'checkbox':
				this.selectedRows = e.checkbox;
				this.totalCallNo = this.selectedRows.reduce(
					(total, cv) => total + cv.callNo,
					0,
				);
				this.cdr.detectChanges();
				break;
			case 'filter':
				this.queryParams[e.filter.indexKey] = e.filter.filter.menus
					.filter((w) => w.checked)
					.map((item) => item.value)
					.join(',');
				this.getData();
				break;
			case 'pi':
				this.queryParams.pi = e.pi;
				this.getData();
				break;
			case 'ps':
				this.queryParams.ps = e.ps;
				this.getData();
				break;
			case 'sort':
				this.queryParams.active = e.sort.column.indexKey || '';
				this.queryParams.direction = e.sort.value || '';
				this.getData();
				break;
		}
	}

	remove(id?) {
		const ids = id ? id : this.selectedRows.map((i) => i.id).join(',');
		if (ids) {
			this.modalSrv.confirm({
				nzTitle: '<strong>是否确定删除<strong>',
				nzOkType: 'danger',
				nzOnOk: () => {
					this.blkSrv.setBlockStatus(true);
					this.comSrv.deleteProduct(ids).subscribe(
						() => {
							this.blkSrv.setBlockStatus(false);
							this.getData();
							this.st.clearCheck();
						},
						(err: HttpErrorResponse) => {
							this.blkSrv.setBlockStatus(false);
						},
					);
				},
			});
		} else {
			this.msgSrv.info('选择');
		}
	}

	restore(id?) {
		const ids = id ? id : this.selectedRows.map((i) => i.id).join(',');
		if (ids) {
			this.modalSrv.confirm({
				nzTitle: '<strong>是否确定恢复<strong>',
				nzOkType: 'danger',
				nzOnOk: () => {
					this.blkSrv.setBlockStatus(true);
					this.comSrv.restoreProduct(ids).subscribe(
						() => {
							this.blkSrv.setBlockStatus(false);
							this.getData();
							this.st.clearCheck();
						},
						(err: HttpErrorResponse) => {
							this.blkSrv.setBlockStatus(false);
						},
					);
				},
			});
		} else {
			this.msgSrv.error(`选择`, { nzDuration: 1000 * 3 });
		}
	}

	fetchChildren(value) {
		value.forEach((element) => {
			element.value = element.id;
			element.label = element.name.zh;
			element.parent = element.pid;
			element.isLeaf = !element.children.length;
			element.children = this.fetchChildren(element.children);
		});
		return value;
	}

	openApplicantView(record: any = {}, action: string = '') {
		this.modal
			.create(
				ApplicantViewComponent,
				{ data: { record } },
				{ size: 1240 },
			)
			.subscribe((res) => {
				this.getData();
				this.cdr.detectChanges();
			});
	}

	reset() {
		// wait form reset updated finished
		setTimeout(() => this.getData());
	}

	download() {
		this.modalSrv.confirm({
			nzTitle: '<strong>是否确定导出搜索结果<strong>',
			nzOnOk: () => {
				this.blkSrv.setBlockStatus(true);
				this.comSrv
					.getExpoApplicantBuyers({
						...this.queryParams,
						pi: '',
						ps: '',
					})
					.subscribe(
						(res: any) => {
							this.blkSrv.setBlockStatus(false);
							const data = [
								[
									'举办名称',
									'编号',
									'参观者',
									'邀请人数',
									'申请时间',
									'处理状态',
								],
							];
							res.data.list.forEach((element) => {
								data.push([
									(element.expo &&
										element.expo.name &&
										element.expo.name.zh) ||
										'-',

									element.numbering || '-',
									`${
										(element.user &&
											element.user.name.zh) ||
										'-'
									} / ${
										(element.user && element.user.phone) ||
										'-'
									} / ${
										(element.user && element.user.email) ||
										'-'
									}`,
									(element.friends &&
										element.friends.length) ||
										'-',
									moment(element.created_at).format(
										'YYYY/MM/DD HH:mm:ss',
									),
									this.status[element.status].text,
								]);
							});
							this.xlsx.export({
								filename: `参观.xlsx`,
								sheets: [
									{
										data,
										name: '参观',
									},
								],
							});
						},
						(err: HttpErrorResponse) => {
							this.blkSrv.setBlockStatus(false);
						},
					);
			},
		});
	}
}
