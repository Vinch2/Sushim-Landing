/* Storage boundary. All business rules use the same database object. */
window.createRentalRepository = function () {
  return new Rental.LocalRepository(window.localStorage);
};
